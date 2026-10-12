import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { query } from '../../config/database';
import { authMiddleware } from '../../common/middleware/auth.middleware';
import { requireRoles } from '../../common/middleware/rbac.middleware';
import { validate } from '../../common/middleware/validation.middleware';
import { Role } from '../../common/constants/roles';
import { sendSuccess } from '../../common/utils/response';
import { NotFoundError, BusinessRuleError } from '../../common/errors';

const router = Router();

const availabilitySchema = z.object({
  availability: z.enum(['ONLINE', 'OFFLINE']),
});

/** PATCH /api/v1/drivers/availability — Toggle online/offline */
router.patch(
  '/availability',
  authMiddleware,
  requireRoles(Role.DRIVER),
  validate(availabilitySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await query(
        `UPDATE drivers SET availability = $1, updated_at = NOW()
         WHERE user_id = $2 RETURNING id, availability`,
        [req.body.availability, req.user!.id]
      );
      if (result.rows.length === 0) throw new NotFoundError('Driver profile');
      sendSuccess(res, { driver: result.rows[0] });
    } catch (error) { next(error); }
  }
);

/** GET /api/v1/drivers/profile — Get driver profile */
router.get(
  '/profile',
  authMiddleware,
  requireRoles(Role.DRIVER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await query(
        `SELECT d.*, u.first_name, u.last_name, u.email, u.phone
         FROM drivers d
         JOIN users u ON d.user_id = u.id
         WHERE d.user_id = $1`,
        [req.user!.id]
      );
      if (result.rows.length === 0) throw new NotFoundError('Driver profile');
      sendSuccess(res, { driver: result.rows[0] });
    } catch (error) { next(error); }
  }
);

export default router;
