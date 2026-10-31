import { Request, Response, NextFunction } from 'express';
import { cacheService } from '../../redis/cache.service';
import { AppError, RateLimitError } from '../errors';
import { logger } from '../utils/logger';

interface RateLimitOptions {
  /** Redis key prefix */
  keyPrefix: string;
  /** Maximum number of requests allowed in the window */
  maxRequests: number;
  /** Window duration in seconds */
  windowSeconds: number;
  /** Function to extract the identifier (default: IP address) */
  keyExtractor?: (req: Request) => string;
}

/**
 * Redis-backed rate limiter middleware.
 * Falls open on Redis failure (allows requests through with a warning log).
 */
export function rateLimiter(options: RateLimitOptions) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const {
      keyPrefix,
      maxRequests,
      windowSeconds,
      keyExtractor = (r) => r.ip || 'unknown',
    } = options;

    const identifier = keyExtractor(req);
    const key = `${keyPrefix}:${identifier}`;

    try {
      const count = await cacheService.increment(key, windowSeconds);

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - count));

      if (count > maxRequests) {
        logger.warn({ key, count, maxRequests, ip: req.ip }, 'Rate limit exceeded');
        throw new RateLimitError();
      }

      next();
    } catch (error) {
      if (error instanceof AppError) {
        next(error);
        return;
      }
      // Redis failure — fail open
      logger.warn({ key, error }, 'Rate limiter Redis error, allowing request');
      next();
    }
  };
}
