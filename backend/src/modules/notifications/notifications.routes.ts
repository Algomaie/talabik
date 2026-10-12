import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../../config/database';
import { authMiddleware } from '../../common/middleware/auth.middleware';
import { sendSuccess, sendPaginated } from '../../common/utils/response';
import { parsePagination } from '../../common/utils/pagination';
import { NotFoundError } from '../../common/errors';

const router = Router();

/** GET /api/v1/notifications — List user's notifications */
router.get('/', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, offset } = parsePagination(req.query as any);

    const countResult = await query<{ count: string }>(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1',
      [req.user!.id]
    );

    const result = await query(
      `SELECT * FROM notifications WHERE user_id = $1
       ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [req.user!.id, limit, offset]
    );

    sendPaginated(res, result.rows, parseInt(countResult.rows[0].count, 10), page, limit);
  } catch (error) { next(error); }
});

/** GET /api/v1/notifications/unread-count — Unread count */
router.get('/unread-count', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await query<{ count: string }>(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false',
      [req.user!.id]
    );
    sendSuccess(res, { count: parseInt(result.rows[0].count, 10) });
  } catch (error) { next(error); }
});

/** PATCH /api/v1/notifications/:id/read — Mark as read */
router.patch('/:id/read', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await query(
      `UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2 RETURNING *`,
      [req.params.id, req.user!.id]
    );
    if (result.rows.length === 0) throw new NotFoundError('Notification');
    sendSuccess(res, { notification: result.rows[0] });
  } catch (error) { next(error); }
});

/** PATCH /api/v1/notifications/read-all — Mark all as read */
router.patch('/read-all', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await query(
      'UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false',
      [req.user!.id]
    );
    sendSuccess(res, { message: 'All notifications marked as read' });
  } catch (error) { next(error); }
});

export default router;
