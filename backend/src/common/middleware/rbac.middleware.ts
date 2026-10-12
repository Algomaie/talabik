import { Request, Response, NextFunction } from 'express';
import { AuthorizationError } from '../errors';
import { Role } from '../constants/roles';

/**
 * RBAC middleware — checks if the authenticated user has at least one of the required roles.
 * Must be used AFTER authMiddleware.
 */
export function requireRoles(...allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AuthorizationError('Authentication required', 'NOT_AUTHENTICATED'));
      return;
    }

    const userRoles = req.user.roles;
    const hasRole = allowedRoles.some((role) => userRoles.includes(role));

    if (!hasRole) {
      next(
        new AuthorizationError(
          `Requires one of: ${allowedRoles.join(', ')}`,
          'INSUFFICIENT_ROLE'
        )
      );
      return;
    }

    next();
  };
}

/**
 * Ensures the authenticated user owns the resource being accessed.
 * Takes a function that extracts the owner ID from the request.
 */
export function requireOwnership(getOwnerId: (req: Request) => string | undefined) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AuthorizationError('Authentication required', 'NOT_AUTHENTICATED'));
      return;
    }

    // Admins bypass ownership checks
    if (req.user.roles.includes(Role.ADMIN)) {
      next();
      return;
    }

    const ownerId = getOwnerId(req);
    if (ownerId && ownerId !== req.user.id) {
      next(
        new AuthorizationError(
          'You do not have access to this resource',
          'RESOURCE_NOT_OWNED'
        )
      );
      return;
    }

    next();
  };
}
