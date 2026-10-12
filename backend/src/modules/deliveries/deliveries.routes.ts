import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { query, withTransaction } from '../../config/database';
import { ordersRepository } from '../orders/orders.repository';
import { authMiddleware } from '../../common/middleware/auth.middleware';
import { requireRoles } from '../../common/middleware/rbac.middleware';
import { validate } from '../../common/middleware/validation.middleware';
import { Role } from '../../common/constants/roles';
import { sendSuccess, sendPaginated } from '../../common/utils/response';
import { parsePagination } from '../../common/utils/pagination';
import { NotFoundError, BusinessRuleError, ConflictError } from '../../common/errors';
import { OrderStatus, isValidTransition } from '../../common/constants/order-statuses';
import { logger } from '../../common/utils/logger';

// ─── Validation ──────────────────────────────────────────────────

const updateLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

// ─── Helpers ─────────────────────────────────────────────────────

async function getDriverId(userId: string): Promise<string> {
  const result = await query<{ id: string }>(
    'SELECT id FROM drivers WHERE user_id = $1',
    [userId]
  );
  if (result.rows.length === 0) throw new NotFoundError('Driver profile');
  return result.rows[0].id;
}

// ─── Routes ──────────────────────────────────────────────────────

const router = Router();

/** GET /api/v1/deliveries/available — List available deliveries (driver) */
router.get(
  '/available',
  authMiddleware,
  requireRoles(Role.DRIVER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, limit, offset } = parsePagination(req.query as any);

      const countResult = await query<{ count: string }>(
        `SELECT COUNT(*) as count FROM deliveries d
         JOIN orders o ON d.order_id = o.id
         WHERE d.status = 'PENDING' AND o.status = 'READY_FOR_PICKUP'`
      );
      const total = parseInt(countResult.rows[0].count, 10);

      const result = await query(
        `SELECT d.*, o.order_number, o.total as order_total, s.name as store_name,
                s.address as store_address, s.latitude as store_lat, s.longitude as store_lng
         FROM deliveries d
         JOIN orders o ON d.order_id = o.id
         JOIN stores s ON o.store_id = s.id
         WHERE d.status = 'PENDING' AND o.status = 'READY_FOR_PICKUP'
         ORDER BY o.created_at ASC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );

      sendPaginated(res, result.rows, total, page, limit);
    } catch (error) { next(error); }
  }
);

/** POST /api/v1/deliveries/:id/accept — Accept delivery (driver) */
router.post(
  '/:id/accept',
  authMiddleware,
  requireRoles(Role.DRIVER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const driverId = await getDriverId(req.user!.id);
      const deliveryId = req.params.id;

      // Atomic acceptance — prevents double-accept via WHERE clause
      const result = await withTransaction(async (client) => {
        // Lock the delivery row and check it's still available
        const lockResult = await client.query(
          `SELECT d.*, o.id as order_id, o.status as order_status
           FROM deliveries d
           JOIN orders o ON d.order_id = o.id
           WHERE d.id = $1 AND d.status = 'PENDING' AND d.driver_id IS NULL
           FOR UPDATE`,
          [deliveryId]
        );

        if (lockResult.rows.length === 0) {
          throw new ConflictError(
            'Delivery is no longer available',
            'DELIVERY_ALREADY_TAKEN'
          );
        }

        const delivery = lockResult.rows[0];

        // Assign driver to delivery
        await client.query(
          `UPDATE deliveries SET driver_id = $1, status = 'ASSIGNED', assigned_at = NOW(), updated_at = NOW()
           WHERE id = $2`,
          [driverId, deliveryId]
        );

        // Update order status to ASSIGNED
        await client.query(
          `UPDATE orders SET status = 'ASSIGNED', updated_at = NOW() WHERE id = $1`,
          [delivery.order_id]
        );

        // Set driver to BUSY
        await client.query(
          `UPDATE drivers SET availability = 'BUSY', updated_at = NOW() WHERE id = $1`,
          [driverId]
        );

        return delivery;
      });

      logger.info({ deliveryId, driverId }, 'Delivery accepted');
      sendSuccess(res, { message: 'Delivery accepted', deliveryId });
    } catch (error) { next(error); }
  }
);

/** POST /api/v1/deliveries/:id/pickup — Confirm pickup (driver) */
router.post(
  '/:id/pickup',
  authMiddleware,
  requireRoles(Role.DRIVER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const driverId = await getDriverId(req.user!.id);

      const delivery = await query(
        'SELECT * FROM deliveries WHERE id = $1 AND driver_id = $2',
        [req.params.id, driverId]
      );
      if (delivery.rows.length === 0) throw new NotFoundError('Delivery');
      if (delivery.rows[0].status !== 'ASSIGNED') {
        throw new BusinessRuleError('Can only pickup assigned deliveries', 'INVALID_STATUS_TRANSITION');
      }

      await query(
        `UPDATE deliveries SET status = 'PICKED_UP', picked_up_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [req.params.id]
      );

      await query(
        `UPDATE orders SET status = 'PICKED_UP', picked_up_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [delivery.rows[0].order_id]
      );

      logger.info({ deliveryId: req.params.id }, 'Order picked up');
      sendSuccess(res, { message: 'Pickup confirmed' });
    } catch (error) { next(error); }
  }
);

/** PATCH /api/v1/deliveries/:id/status — Set OUT_FOR_DELIVERY (driver) */
router.patch(
  '/:id/status',
  authMiddleware,
  requireRoles(Role.DRIVER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const driverId = await getDriverId(req.user!.id);

      const delivery = await query(
        'SELECT * FROM deliveries WHERE id = $1 AND driver_id = $2',
        [req.params.id, driverId]
      );
      if (delivery.rows.length === 0) throw new NotFoundError('Delivery');
      if (delivery.rows[0].status !== 'PICKED_UP') {
        throw new BusinessRuleError('Can only start transit after pickup', 'INVALID_STATUS_TRANSITION');
      }

      await query(
        `UPDATE deliveries SET status = 'IN_TRANSIT', updated_at = NOW() WHERE id = $1`,
        [req.params.id]
      );

      await query(
        `UPDATE orders SET status = 'OUT_FOR_DELIVERY', updated_at = NOW() WHERE id = $1`,
        [delivery.rows[0].order_id]
      );

      logger.info({ deliveryId: req.params.id }, 'Out for delivery');
      sendSuccess(res, { message: 'Out for delivery' });
    } catch (error) { next(error); }
  }
);

/** PATCH /api/v1/deliveries/:id/location — Update driver location */
router.patch(
  '/:id/location',
  authMiddleware,
  requireRoles(Role.DRIVER),
  validate(updateLocationSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const driverId = await getDriverId(req.user!.id);
      const { latitude, longitude } = req.body;

      // Update delivery current location
      await query(
        `UPDATE deliveries SET current_latitude = $1, current_longitude = $2, updated_at = NOW()
         WHERE id = $3 AND driver_id = $4`,
        [latitude, longitude, req.params.id, driverId]
      );

      // Update driver current location
      await query(
        `UPDATE drivers SET current_latitude = $1, current_longitude = $2, updated_at = NOW()
         WHERE id = $3`,
        [latitude, longitude, driverId]
      );

      sendSuccess(res, { message: 'Location updated' });
    } catch (error) { next(error); }
  }
);

/** POST /api/v1/deliveries/:id/complete — Confirm delivery (driver) */
router.post(
  '/:id/complete',
  authMiddleware,
  requireRoles(Role.DRIVER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const driverId = await getDriverId(req.user!.id);

      const delivery = await query(
        'SELECT * FROM deliveries WHERE id = $1 AND driver_id = $2',
        [req.params.id, driverId]
      );
      if (delivery.rows.length === 0) throw new NotFoundError('Delivery');
      if (delivery.rows[0].status !== 'IN_TRANSIT') {
        throw new BusinessRuleError('Can only complete in-transit deliveries', 'INVALID_STATUS_TRANSITION');
      }

      await withTransaction(async (client) => {
        // Complete delivery
        await client.query(
          `UPDATE deliveries SET status = 'DELIVERED', delivered_at = NOW(), updated_at = NOW()
           WHERE id = $1`,
          [req.params.id]
        );

        // Complete order
        await client.query(
          `UPDATE orders SET status = 'DELIVERED', delivered_at = NOW(), updated_at = NOW()
           WHERE id = $1`,
          [delivery.rows[0].order_id]
        );

        // Update driver stats + set back to ONLINE
        await client.query(
          `UPDATE drivers SET availability = 'ONLINE',
                              total_deliveries = total_deliveries + 1,
                              total_earnings = total_earnings + $1,
                              updated_at = NOW()
           WHERE id = $2`,
          [delivery.rows[0].delivery_fee, driverId]
        );
      });

      logger.info({ deliveryId: req.params.id, driverId }, 'Delivery completed');
      sendSuccess(res, { message: 'Delivery completed' });
    } catch (error) { next(error); }
  }
);

/** GET /api/v1/deliveries/history — Driver delivery history */
router.get(
  '/history',
  authMiddleware,
  requireRoles(Role.DRIVER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const driverId = await getDriverId(req.user!.id);
      const { page, limit, offset } = parsePagination(req.query as any);

      const countResult = await query<{ count: string }>(
        'SELECT COUNT(*) as count FROM deliveries WHERE driver_id = $1',
        [driverId]
      );

      const result = await query(
        `SELECT d.*, o.order_number, o.total as order_total, s.name as store_name
         FROM deliveries d
         JOIN orders o ON d.order_id = o.id
         JOIN stores s ON o.store_id = s.id
         WHERE d.driver_id = $1
         ORDER BY d.created_at DESC
         LIMIT $2 OFFSET $3`,
        [driverId, limit, offset]
      );

      sendPaginated(res, result.rows, parseInt(countResult.rows[0].count, 10), page, limit);
    } catch (error) { next(error); }
  }
);

/** GET /api/v1/deliveries/earnings — Driver earnings */
router.get(
  '/earnings',
  authMiddleware,
  requireRoles(Role.DRIVER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const driverId = await getDriverId(req.user!.id);

      const result = await query(
        `SELECT
           COUNT(*) FILTER (WHERE status = 'DELIVERED') as total_completed,
           COALESCE(SUM(delivery_fee) FILTER (WHERE status = 'DELIVERED'), 0) as total_earnings,
           COUNT(*) FILTER (WHERE status = 'DELIVERED' AND delivered_at::date = CURRENT_DATE) as today_completed,
           COALESCE(SUM(delivery_fee) FILTER (WHERE status = 'DELIVERED' AND delivered_at::date = CURRENT_DATE), 0) as today_earnings
         FROM deliveries WHERE driver_id = $1`,
        [driverId]
      );

      sendSuccess(res, { earnings: result.rows[0] });
    } catch (error) { next(error); }
  }
);

export default router;
