import { Router } from 'express';
import { authController } from './auth.controller';
import { validate } from '../../common/middleware/validation.middleware';
import { authMiddleware } from '../../common/middleware/auth.middleware';
import { rateLimiter } from '../../common/middleware/rate-limiter.middleware';
import { registerSchema, loginSchema, refreshSchema } from './auth.validation';
import { config } from '../../config';

const router = Router();

/**
 * POST /api/v1/auth/register
 * Rate limited to prevent abuse
 */
router.post(
  '/register',
  rateLimiter({
    keyPrefix: 'ratelimit:register',
    maxRequests: 3,
    windowSeconds: 300, // 3 attempts per 5 minutes
  }),
  validate(registerSchema),
  (req, res, next) => authController.register(req, res, next)
);

/**
 * POST /api/v1/auth/login
 * Strict rate limiting to prevent brute force
 */
router.post(
  '/login',
  rateLimiter({
    keyPrefix: 'ratelimit:login',
    maxRequests: config.rateLimit.loginMax,
    windowSeconds: Math.floor(config.rateLimit.loginWindowMs / 1000),
  }),
  validate(loginSchema),
  (req, res, next) => authController.login(req, res, next)
);

/**
 * POST /api/v1/auth/refresh
 */
router.post(
  '/refresh',
  validate(refreshSchema),
  (req, res, next) => authController.refresh(req, res, next)
);

/**
 * POST /api/v1/auth/logout
 * Requires authentication
 */
router.post(
  '/logout',
  authMiddleware,
  (req, res, next) => authController.logout(req, res, next)
);

/**
 * GET /api/v1/auth/me
 * Get current user profile
 */
router.get(
  '/me',
  authMiddleware,
  (req, res, next) => authController.getMe(req, res, next)
);

export default router;
