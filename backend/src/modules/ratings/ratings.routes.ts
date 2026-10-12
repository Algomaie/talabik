import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { query } from '../../config/database';
import { authMiddleware } from '../../common/middleware/auth.middleware';
import { validate } from '../../common/middleware/validation.middleware';
import { sendSuccess, sendPaginated } from '../../common/utils/response';
import { parsePagination } from '../../common/utils/pagination';
import { BusinessRuleError } from '../../common/errors';

const router = Router();

const createRatingSchema = z.object({
  orderId: z.string().uuid(),
  targetType: z.enum(['STORE', 'DRIVER', 'ORDER']),
  targetId: z.string().uuid(),
  score: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

/** POST /api/v1/ratings — Rate order/store/driver */
router.post(
  '/',
  authMiddleware,
  validate(createRatingSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { orderId, targetType, targetId, score, comment } = req.body;

      // Verify user placed this order
      const orderCheck = await query(
        `SELECT id FROM orders WHERE id = $1 AND user_id = $2 AND status = 'DELIVERED'`,
        [orderId, req.user!.id]
      );
      if (orderCheck.rows.length === 0) {
        throw new BusinessRuleError(
          'Can only rate delivered orders that belong to you',
          'RATING_NOT_ALLOWED'
        );
      }

      const result = await query(
        `INSERT INTO ratings (order_id, user_id, target_type, target_id, score, comment)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (order_id, user_id, target_type) DO UPDATE SET score = $5, comment = $6
         RETURNING *`,
        [orderId, req.user!.id, targetType, targetId, score, comment ?? null]
      );

      // Update aggregate rating on store or driver
      if (targetType === 'STORE') {
        await query(
          `UPDATE stores SET
            avg_rating = (SELECT ROUND(AVG(score)::numeric, 2) FROM ratings WHERE target_type = 'STORE' AND target_id = $1),
            total_ratings = (SELECT COUNT(*) FROM ratings WHERE target_type = 'STORE' AND target_id = $1),
            updated_at = NOW()
           WHERE id = $1`,
          [targetId]
        );
      } else if (targetType === 'DRIVER') {
        await query(
          `UPDATE drivers SET
            avg_rating = (SELECT ROUND(AVG(score)::numeric, 2) FROM ratings WHERE target_type = 'DRIVER' AND target_id = $1),
            updated_at = NOW()
           WHERE id = $1`,
          [targetId]
        );
      }

      sendSuccess(res, { rating: result.rows[0] }, 201);
    } catch (error) { next(error); }
  }
);

/** GET /api/v1/ratings/store/:storeId — Store ratings (public) */
router.get(
  '/store/:storeId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, limit, offset } = parsePagination(req.query as any);

      const countResult = await query<{ count: string }>(
        `SELECT COUNT(*) as count FROM ratings WHERE target_type = 'STORE' AND target_id = $1`,
        [req.params.storeId]
      );

      const result = await query(
        `SELECT r.*, u.first_name, u.last_name
         FROM ratings r
         JOIN users u ON r.user_id = u.id
         WHERE r.target_type = 'STORE' AND r.target_id = $1
         ORDER BY r.created_at DESC LIMIT $2 OFFSET $3`,
        [req.params.storeId, limit, offset]
      );

      sendPaginated(res, result.rows, parseInt(countResult.rows[0].count, 10), page, limit);
    } catch (error) { next(error); }
  }
);

export default router;
