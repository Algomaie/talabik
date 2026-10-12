import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../../config';
import { authRepository } from './auth.repository';
import { RegisterDto, LoginDto, TokenPair, AuthUser } from './auth.types';
import {
  AuthenticationError,
  ConflictError,
  NotFoundError,
  BusinessRuleError,
} from '../../common/errors';
import { cacheService } from '../../redis/cache.service';
import { CacheKeys, CacheTTL } from '../../common/constants/cache-keys';
import { logger } from '../../common/utils/logger';

export class AuthService {
  /**
   * Register a new user with role-specific profile creation.
   */
  async register(dto: RegisterDto): Promise<{ user: AuthUser; tokens: TokenPair }> {
    // Check for existing email
    const exists = await authRepository.emailExists(dto.email);
    if (exists) {
      throw new ConflictError('Email is already registered', 'DUPLICATE_EMAIL');
    }

    // Hash password with Argon2id
    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
      memoryCost: 65536,    // 64 MB
      timeCost: 3,           // 3 iterations
      parallelism: 4,        // 4 threads
    });

    // Create user with role assignment (transaction)
    const userId = await authRepository.createUser(
      dto.email,
      passwordHash,
      dto.firstName,
      dto.lastName,
      dto.phone,
      dto.role
    );

    // Create role-specific profile
    if (dto.role === 'MERCHANT' && dto.businessName) {
      await authRepository.createMerchant(
        userId,
        dto.businessName,
        dto.businessEmail,
        dto.businessPhone
      );
    } else if (dto.role === 'DRIVER') {
      await authRepository.createDriver(
        userId,
        dto.licenseNumber,
        dto.vehicleType,
        dto.vehiclePlate
      );
    }

    // Fetch created user with roles
    const user = await authRepository.findById(userId);
    if (!user) {
      throw new Error('User creation failed unexpectedly');
    }

    // Generate tokens
    const tokens = await this.generateTokenPair(user);

    logger.info({ userId, role: dto.role }, 'User registered');

    return { user, tokens };
  }

  /**
   * Authenticate a user and return tokens.
   */
  async login(dto: LoginDto): Promise<{ user: AuthUser; tokens: TokenPair }> {
    // Find user by email
    const userWithPassword = await authRepository.findByEmail(dto.email);
    if (!userWithPassword) {
      throw new AuthenticationError('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    // Check if account is active
    if (!userWithPassword.isActive) {
      throw new BusinessRuleError(
        'Your account has been suspended. Please contact support.',
        'ACCOUNT_SUSPENDED'
      );
    }

    // Verify password
    const isValid = await argon2.verify(userWithPassword.passwordHash, dto.password);
    if (!isValid) {
      throw new AuthenticationError('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    // Update last login
    await authRepository.updateLastLogin(userWithPassword.id);

    // Build user object without password hash
    const user: AuthUser = {
      id: userWithPassword.id,
      email: userWithPassword.email,
      firstName: userWithPassword.firstName,
      lastName: userWithPassword.lastName,
      phone: userWithPassword.phone,
      avatarUrl: userWithPassword.avatarUrl,
      isActive: userWithPassword.isActive,
      roles: userWithPassword.roles,
    };

    // Generate tokens
    const tokens = await this.generateTokenPair(user);

    logger.info({ userId: user.id }, 'User logged in');

    return { user, tokens };
  }

  /**
   * Refresh access token using a valid refresh token.
   * Implements token rotation — old refresh token is invalidated.
   */
  async refresh(refreshToken: string): Promise<TokenPair> {
    // Verify refresh token
    let payload: { sub: string; jti: string };
    try {
      payload = jwt.verify(refreshToken, config.jwt.refreshSecret) as any;
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        throw new AuthenticationError('Refresh token has expired', 'REFRESH_TOKEN_EXPIRED');
      }
      throw new AuthenticationError('Invalid refresh token', 'REFRESH_TOKEN_INVALID');
    }

    // Check if refresh token exists in Redis
    const storedToken = await cacheService.get<string>(
      CacheKeys.refreshToken(payload.sub, payload.jti)
    );
    if (!storedToken) {
      // Token was revoked or doesn't exist
      throw new AuthenticationError('Refresh token has been revoked', 'REFRESH_TOKEN_REVOKED');
    }

    // Delete old refresh token (rotation)
    await cacheService.del(CacheKeys.refreshToken(payload.sub, payload.jti));

    // Fetch user to get current roles
    const user = await authRepository.findById(payload.sub);
    if (!user) {
      throw new NotFoundError('User');
    }

    if (!user.isActive) {
      throw new BusinessRuleError('Account is suspended', 'ACCOUNT_SUSPENDED');
    }

    // Generate new token pair
    const tokens = await this.generateTokenPair(user);

    logger.info({ userId: user.id }, 'Token refreshed');

    return tokens;
  }

  /**
   * Logout — invalidate both access and refresh tokens.
   */
  async logout(userId: string, accessTokenId: string, accessTokenExp: number): Promise<void> {
    // Blacklist the access token for its remaining lifetime
    const remainingTtl = accessTokenExp - Math.floor(Date.now() / 1000);
    if (remainingTtl > 0) {
      await cacheService.set(
        CacheKeys.accessBlacklist(accessTokenId),
        'revoked',
        remainingTtl
      );
    }

    // Delete all refresh tokens for this user (invalidate all sessions)
    await cacheService.delPattern(`refresh:${userId}:*`);

    logger.info({ userId }, 'User logged out');
  }

  /**
   * Get current authenticated user profile.
   */
  async getMe(userId: string): Promise<AuthUser> {
    const user = await authRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }
    return user;
  }

  /**
   * Generate access + refresh token pair.
   * Stores refresh token hash in Redis for validation.
   */
  private async generateTokenPair(user: AuthUser): Promise<TokenPair> {
    const accessTokenId = uuidv4();
    const refreshTokenId = uuidv4();

    // Access token — short-lived, contains user info
    const accessToken = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        roles: user.roles,
        jti: accessTokenId,
      },
      config.jwt.accessSecret,
      { expiresIn: config.jwt.accessExpiresIn as any }
    );

    // Refresh token — long-lived, minimal payload
    const refreshToken = jwt.sign(
      {
        sub: user.id,
        jti: refreshTokenId,
      },
      config.jwt.refreshSecret,
      { expiresIn: config.jwt.refreshExpiresIn as any }
    );

    // Store refresh token reference in Redis
    await cacheService.set(
      CacheKeys.refreshToken(user.id, refreshTokenId),
      refreshTokenId,
      CacheTTL.REFRESH_TOKEN
    );

    return { accessToken, refreshToken };
  }
}

export const authService = new AuthService();
