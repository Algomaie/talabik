import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Logs every request with structured fields:
 * requestId, method, path, statusCode, responseTime, userId.
 */
export function loggerMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  // Log on response finish
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    const logData = {
      requestId: req.id,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      responseTime,
      userId: (req as any).user?.id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    };

    if (res.statusCode >= 500) {
      logger.error(logData, 'Request completed with server error');
    } else if (res.statusCode >= 400) {
      logger.warn(logData, 'Request completed with client error');
    } else {
      logger.info(logData, 'Request completed');
    }
  });

  next();
}
