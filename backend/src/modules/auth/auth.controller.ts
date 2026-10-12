import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { sendSuccess } from '../../common/utils/response';
import { RegisterDto, LoginDto } from './auth.types';
import jwt from 'jsonwebtoken';
import { config } from '../../config';

/**
 * Auth controller — handles HTTP concerns only.
 * All business logic is delegated to AuthService.
 */
export class AuthController {
  /**
   * POST /api/v1/auth/register
   */
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto: RegisterDto = req.body;
      const { user, tokens } = await authService.register(dto);

      sendSuccess(res, { user, ...tokens }, 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/auth/login
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto: LoginDto = req.body;
      const { user, tokens } = await authService.login(dto);

      sendSuccess(res, { user, ...tokens });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/auth/refresh
   */
  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;
      const tokens = await authService.refresh(refreshToken);

      sendSuccess(res, tokens);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/auth/logout
   */
  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const tokenId = req.user!.tokenId;

      // Decode access token to get expiration
      const token = req.headers.authorization!.split(' ')[1];
      const decoded = jwt.decode(token) as { exp: number };

      await authService.logout(userId, tokenId, decoded.exp);

      sendSuccess(res, { message: 'Logged out successfully' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/auth/me
   */
  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const user = await authService.getMe(userId);

      sendSuccess(res, { user });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
