import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import argon2 from 'argon2';
import { query } from '../../config/database';
import { authMiddleware } from '../../common/middleware/auth.middleware';
import { validate } from '../../common/middleware/validation.middleware';
import { sendSuccess } from '../../common/utils/response';
import { AuthenticationError, NotFoundError } from '../../common/errors';

const router = Router();

const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(100).trim().optional(),
  lastName: z.string().min(1).max(100).trim().optional(),
  phone: z.string().max(20).optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8).max(100)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and number'),
});

/** GET /api/v1/users/profile */
router.get('/profile', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.avatar_url,
              u.is_active, u.email_verified, u.last_login_at, u.created_at
       FROM users u WHERE u.id = $1`,
      [req.user!.id]
    );
    if (result.rows.length === 0) throw new NotFoundError('User');
    sendSuccess(res, { profile: result.rows[0] });
  } catch (error) { next(error); }
});

/** PATCH /api/v1/users/profile */
router.patch(
  '/profile',
  authMiddleware,
  validate(updateProfileSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const fields: string[] = [];
      const values: any[] = [];
      let idx = 1;

      if (req.body.firstName !== undefined) { fields.push(`first_name = $${idx}`); values.push(req.body.firstName); idx++; }
      if (req.body.lastName !== undefined) { fields.push(`last_name = $${idx}`); values.push(req.body.lastName); idx++; }
      if (req.body.phone !== undefined) { fields.push(`phone = $${idx}`); values.push(req.body.phone); idx++; }

      if (fields.length === 0) {
        return sendSuccess(res, { message: 'No changes' });
      }

      fields.push('updated_at = NOW()');
      values.push(req.user!.id);

      const result = await query(
        `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx}
         RETURNING id, email, first_name, last_name, phone, avatar_url`,
        values
      );

      sendSuccess(res, { profile: result.rows[0] });
    } catch (error) { next(error); }
  }
);

/** PATCH /api/v1/users/password */
router.patch(
  '/password',
  authMiddleware,
  validate(changePasswordSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { currentPassword, newPassword } = req.body;

      // Get current hash
      const result = await query<{ password_hash: string }>(
        'SELECT password_hash FROM users WHERE id = $1',
        [req.user!.id]
      );
      if (result.rows.length === 0) throw new NotFoundError('User');

      // Verify current password
      const isValid = await argon2.verify(result.rows[0].password_hash, currentPassword);
      if (!isValid) {
        throw new AuthenticationError('Current password is incorrect', 'INVALID_CREDENTIALS');
      }

      // Hash new password
      const newHash = await argon2.hash(newPassword, {
        type: argon2.argon2id,
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 4,
      });

      await query(
        'UPDATE users SET password_hash = $1, token_version = token_version + 1, updated_at = NOW() WHERE id = $2',
        [newHash, req.user!.id]
      );

      sendSuccess(res, { message: 'Password changed successfully' });
    } catch (error) { next(error); }
  }
);

export default router;
