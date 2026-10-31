import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../../config/database';
import { authMiddleware } from '../../common/middleware/auth.middleware';
import { requireRoles } from '../../common/middleware/rbac.middleware';
import { Role } from '../../common/constants/roles';
import { sendSuccess, sendPaginated } from '../../common/utils/response';
import { parsePagination } from '../../common/utils/pagination';
import { NotFoundError } from '../../common/errors';
import { z } from 'zod';
import { validate } from '../../common/middleware/validation.middleware';

const router = Router();

// All admin routes require authentication + ADMIN role
router.use(authMiddleware, requireRoles(Role.ADMIN));

/** GET /api/v1/admin/dashboard — Dashboard stats */
router.get('/dashboard', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await query(`
      SELECT
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM merchants WHERE status = 'APPROVED') as active_merchants,
        (SELECT COUNT(*) FROM drivers WHERE status = 'APPROVED') as active_drivers,
        (SELECT COUNT(*) FROM drivers WHERE availability = 'ONLINE') as online_drivers,
        (SELECT COUNT(*) FROM orders WHERE created_at::date = CURRENT_DATE) as orders_today,
        (SELECT COUNT(*) FROM orders WHERE status = 'PENDING') as pending_orders,
        (SELECT COUNT(*) FROM orders WHERE status = 'DELIVERED') as completed_orders,
        (SELECT COUNT(*) FROM orders WHERE status = 'DELIVERED' AND delivered_at::date = CURRENT_DATE) as delivered_today,
        (SELECT COALESCE(SUM(total), 0) FROM orders WHERE status = 'DELIVERED') as total_revenue,
        (SELECT COALESCE(SUM(total), 0) FROM orders WHERE status = 'DELIVERED' AND delivered_at::date = CURRENT_DATE) as revenue_today,
        (SELECT COUNT(*) FROM stores WHERE is_active = true) as active_stores,
        (SELECT COUNT(*) FROM products WHERE is_active = true) as active_products
    `);

    sendSuccess(res, { dashboard: stats.rows[0] });
  } catch (error) { next(error); }
});

/** GET /api/v1/admin/users — List all users */
router.get('/users', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, offset } = parsePagination(req.query as any);
    const search = req.query.search as string | undefined;

    let whereClause = '';
    const params: any[] = [];

    if (search) {
      params.push(`%${search}%`);
      whereClause = `WHERE u.email ILIKE $1 OR u.first_name ILIKE $1 OR u.last_name ILIKE $1`;
    }

    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM users u ${whereClause}`,
      params
    );

    params.push(limit, offset);
    const result = await query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.is_active,
              u.email_verified, u.last_login_at, u.created_at,
              COALESCE(json_agg(r.name) FILTER (WHERE r.name IS NOT NULL), '[]') as roles
       FROM users u
       LEFT JOIN user_roles ur ON u.id = ur.user_id
       LEFT JOIN roles r ON ur.role_id = r.id
       ${whereClause}
       GROUP BY u.id
       ORDER BY u.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    sendPaginated(res, result.rows, parseInt(countResult.rows[0].count, 10), page, limit);
  } catch (error) { next(error); }
});

/** PATCH /api/v1/admin/users/:id/status — Activate/suspend user */
router.patch('/users/:id/status', validate(z.object({ isActive: z.boolean() })), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { isActive } = req.body;
    const result = await query(
      'UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING id, email, is_active',
      [isActive, req.params.id]
    );
    if (result.rows.length === 0) throw new NotFoundError('User');
    sendSuccess(res, { user: result.rows[0] });
  } catch (error) { next(error); }
});

/** GET /api/v1/admin/merchants — List merchants */
router.get('/merchants', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, offset } = parsePagination(req.query as any);

    const countResult = await query<{ count: string }>('SELECT COUNT(*) as count FROM merchants');

    const result = await query(
      `SELECT m.*, u.email, u.first_name, u.last_name, u.is_active as user_active,
              (SELECT COUNT(*) FROM stores WHERE merchant_id = m.id) as store_count
       FROM merchants m
       JOIN users u ON m.user_id = u.id
       ORDER BY m.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    sendPaginated(res, result.rows, parseInt(countResult.rows[0].count, 10), page, limit);
  } catch (error) { next(error); }
});

/** PATCH /api/v1/admin/merchants/:id/status — Approve/suspend merchant */
router.patch('/merchants/:id/status', validate(z.object({ status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED']) })), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body;
    const result = await query(
      `UPDATE merchants SET status = $1::varchar, approved_at = CASE WHEN $1::varchar = 'APPROVED' THEN NOW() ELSE approved_at END,
                            updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [status, req.params.id]
    );
    if (result.rows.length === 0) throw new NotFoundError('Merchant');
    sendSuccess(res, { merchant: result.rows[0] });
  } catch (error) { next(error); }
});

/** GET /api/v1/admin/drivers — List drivers */
router.get('/drivers', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, offset } = parsePagination(req.query as any);

    const countResult = await query<{ count: string }>('SELECT COUNT(*) as count FROM drivers');

    const result = await query(
      `SELECT d.*, u.email, u.first_name, u.last_name, u.is_active as user_active
       FROM drivers d
       JOIN users u ON d.user_id = u.id
       ORDER BY d.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    sendPaginated(res, result.rows, parseInt(countResult.rows[0].count, 10), page, limit);
  } catch (error) { next(error); }
});

/** PATCH /api/v1/admin/drivers/:id/status — Approve/suspend driver */
router.patch('/drivers/:id/status', validate(z.object({ status: z.enum(['PENDING', 'APPROVED', 'SUSPENDED']) })), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body;
    const result = await query(
      'UPDATE drivers SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, req.params.id]
    );
    if (result.rows.length === 0) throw new NotFoundError('Driver');
    sendSuccess(res, { driver: result.rows[0] });
  } catch (error) { next(error); }
});

/** GET /api/v1/admin/orders — List all orders */
router.get('/orders', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, offset } = parsePagination(req.query as any);
    const status = req.query.status as string | undefined;

    const params: any[] = [];
    let whereClause = '';
    if (status) {
      params.push(status);
      whereClause = `WHERE o.status = $1`;
    }

    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM orders o ${whereClause}`,
      params
    );

    params.push(limit, offset);
    const result = await query(
      `SELECT o.*, s.name as store_name,
              u.first_name || ' ' || u.last_name as customer_name
       FROM orders o
       JOIN stores s ON o.store_id = s.id
       JOIN users u ON o.user_id = u.id
       ${whereClause}
       ORDER BY o.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    sendPaginated(res, result.rows, parseInt(countResult.rows[0].count, 10), page, limit);
  } catch (error) { next(error); }
});

/** GET /api/v1/admin/reports — Reports & analytics */
router.get('/reports', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Orders by status
    const ordersByStatus = await query(
      `SELECT status, COUNT(*) as count, COALESCE(SUM(total), 0) as total_amount
       FROM orders GROUP BY status ORDER BY count DESC`
    );

    // Revenue by day (last 30 days)
    const revenueByDay = await query(
      `SELECT DATE(delivered_at) as date, COUNT(*) as orders, SUM(total) as revenue
       FROM orders WHERE status = 'DELIVERED' AND delivered_at >= NOW() - INTERVAL '30 days'
       GROUP BY DATE(delivered_at) ORDER BY date DESC`
    );

    // Top stores by revenue
    const topStores = await query(
      `SELECT s.name, COUNT(o.id) as order_count, COALESCE(SUM(o.total), 0) as revenue
       FROM orders o
       JOIN stores s ON o.store_id = s.id
       WHERE o.status = 'DELIVERED'
       GROUP BY s.id, s.name
       ORDER BY revenue DESC LIMIT 10`
    );

    // Top products
    const topProducts = await query(
      `SELECT oi.product_name, SUM(oi.quantity) as total_sold, SUM(oi.total) as total_revenue
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       WHERE o.status = 'DELIVERED'
       GROUP BY oi.product_name
       ORDER BY total_sold DESC LIMIT 10`
    );

    sendSuccess(res, {
      reports: {
        ordersByStatus: ordersByStatus.rows,
        revenueByDay: revenueByDay.rows,
        topStores: topStores.rows,
        topProducts: topProducts.rows,
      },
    });
  } catch (error) { next(error); }
});

/** GET /api/v1/admin/audit-logs — Audit logs */
router.get('/audit-logs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, offset } = parsePagination(req.query as any);
    const action = req.query.action as string | undefined;

    const params: any[] = [];
    let whereClause = '';
    if (action) {
      params.push(action);
      whereClause = `WHERE a.action = $1`;
    }

    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM audit_logs a ${whereClause}`,
      params
    );

    params.push(limit, offset);
    const result = await query(
      `SELECT a.*, u.email as user_email, u.first_name, u.last_name
       FROM audit_logs a
       LEFT JOIN users u ON a.user_id = u.id
       ${whereClause}
       ORDER BY a.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    sendPaginated(res, result.rows, parseInt(countResult.rows[0].count, 10), page, limit);
  } catch (error) { next(error); }
});

export default router;
