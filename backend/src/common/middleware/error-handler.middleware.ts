import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors';
import { sendError } from '../utils/response';
import { logger } from '../utils/logger';
import { config } from '../../config';

/**
 * Centralized error handler — catches all errors thrown in route handlers.
 * Operational errors (AppError subclasses) are sent with their status and code.
 * Unknown errors are logged and a generic 500 is returned (no internal details exposed).
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Prevent double-sending if headers already sent
  if (res.headersSent) {
    return;
  }

  if (err instanceof AppError) {
    // Operational error — safe to expose to client
    if (err.statusCode >= 500) {
      logger.error(
        { err, requestId: req.id, path: req.originalUrl },
        'Server error (operational)'
      );
    }

    sendError(res, err.statusCode, err.errorCode, err.message, err.details);
    return;
  }

  // Unknown / unexpected error — never expose details
  logger.error(
    {
      err,
      requestId: req.id,
      method: req.method,
      path: req.originalUrl,
      stack: err.stack,
    },
    'Unhandled error'
  );

  sendError(
    res,
    500,
    'INTERNAL_ERROR',
    config.isProduction
      ? 'An unexpected error occurred'
      : err.message // Show message in dev for debugging
  );
}
