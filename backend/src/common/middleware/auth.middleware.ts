import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../../config';
import { AuthenticationError } from '../errors';
import { cacheService } from '../../redis/cache.service';
import { CacheKeys } from '../constants/cache-keys';

export interface JwtPayload {
  sub: string;       // user ID
  email: string;
  roles: string[];
  jti: string;       // token ID (for blacklisting)
  iat: number;
  exp: number;
}

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        roles: string[];
        tokenId: string;
      };
    }
  }
}

/**
 * Verifies JWT access token from Authorization header.
 * Also checks Redis blacklist for revoked tokens.
 */
export async function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('Access token is required', 'TOKEN_MISSING');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new AuthenticationError('Access token is required', 'TOKEN_MISSING');
    }

    // Verify token signature and expiration
    let payload: JwtPayload;
    try {
      payload = jwt.verify(token, config.jwt.accessSecret) as JwtPayload;
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        throw new AuthenticationError('Access token has expired', 'TOKEN_EXPIRED');
      }
      throw new AuthenticationError('Invalid access token', 'TOKEN_INVALID');
    }

    // Check if token has been blacklisted (revoked via logout)
    const isBlacklisted = await cacheService.exists(
      CacheKeys.accessBlacklist(payload.jti)
    );
    if (isBlacklisted) {
      throw new AuthenticationError('Token has been revoked', 'TOKEN_REVOKED');
    }

    // Attach user info to request
    req.user = {
      id: payload.sub,
      email: payload.email,
      roles: payload.roles,
      tokenId: payload.jti,
    };

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Optional auth — attaches user if token present, but doesn't require it.
 * Useful for endpoints that behave differently for authenticated users.
 */
export async function optionalAuthMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return next();
    }

    try {
      const payload = jwt.verify(token, config.jwt.accessSecret) as JwtPayload;
      const isBlacklisted = await cacheService.exists(
        CacheKeys.accessBlacklist(payload.jti)
      );
      if (!isBlacklisted) {
        req.user = {
          id: payload.sub,
          email: payload.email,
          roles: payload.roles,
          tokenId: payload.jti,
        };
      }
    } catch {
      // Token invalid — proceed without user (optional auth)
    }

    next();
  } catch (error) {
    next(error);
  }
}
