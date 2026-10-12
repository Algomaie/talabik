import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Assigns a unique request ID to every incoming request.
 * Used for distributed tracing and correlating logs.
 */
export function requestIdMiddleware(req: Request, _res: Response, next: NextFunction): void {
  req.id = req.headers['x-request-id'] as string || uuidv4();
  next();
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      id: string;
    }
  }
}
