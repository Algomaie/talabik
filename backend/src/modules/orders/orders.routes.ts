import { Router, Request, Response, NextFunction } from 'express';
import { ordersService } from './orders.service';
import { validate } from '../../common/middleware/validation.middleware';
import { authMiddleware } from '../../common/middleware/auth.middleware';
import { requireRoles } from '../../common/middleware/rbac.middleware';
import { createOrderSchema, cancelOrderSchema, updateOrderStatusSchema } from './orders.validation';
import { Role } from '../../common/constants/roles';
import { sendSuccess, sendPaginated } from '../../common/utils/response';
import { parsePagination } from '../../common/utils/pagination';

const router = Router();

/** POST /api/v1/orders — Create order from cart (customer) */
router.post(
  '/',
  authMiddleware,
  requireRoles(Role.CUSTOMER),
  (req, _res, next) => {
    if (req.headers['idempotency-key'] !== undefined) req.body.idempotencyKey = req.headers['idempotency-key'];
    next();
  },
  validate(createOrderSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Support Idempotency-Key header
      const idempotencyKey = req.headers['idempotency-key'] as string || req.body.idempotencyKey;
      const order = await ordersService.createOrder(req.user!.id, {
        ...req.body,
        idempotencyKey,
      });
      sendSuccess(res, { order }, 201);
    } catch (error) { next(error); }
  }
);

/** GET /api/v1/orders — List own orders (customer) */
router.get(
  '/',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, limit } = parsePagination(req.query as any);
      const status = req.query.status as string | undefined;

      let result;
      if (req.user!.roles.includes(Role.MERCHANT)) {
        result = await ordersService.getMerchantOrders(req.user!.id, status, page, limit);
      } else {
        result = await ordersService.getUserOrders(req.user!.id, status, page, limit);
      }

      sendPaginated(res, result.orders, result.total, page, limit);
    } catch (error) { next(error); }
  }
);

/** GET /api/v1/orders/:id — Order details */
router.get(
  '/:id',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const order = await ordersService.getOrderById(
        req.params.id as string, req.user!.id, req.user!.roles
      );
      sendSuccess(res, { order });
    } catch (error) { next(error); }
  }
);

/** POST /api/v1/orders/:id/cancel — Cancel order (customer) */
router.post(
  '/:id/cancel',
  authMiddleware,
  requireRoles(Role.CUSTOMER),
  validate(cancelOrderSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const order = await ordersService.cancelOrder(req.user!.id, req.params.id as string, req.body.reason);
      sendSuccess(res, { order });
    } catch (error) { next(error); }
  }
);

/** POST /api/v1/orders/:id/confirm — Confirm order (merchant) */
router.post(
  '/:id/confirm',
  authMiddleware,
  requireRoles(Role.MERCHANT),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const order = await ordersService.confirmOrder(req.user!.id, req.params.id as string);
      sendSuccess(res, { order });
    } catch (error) { next(error); }
  }
);

/** POST /api/v1/orders/:id/reject — Reject order (merchant) */
router.post(
  '/:id/reject',
  authMiddleware,
  requireRoles(Role.MERCHANT),
  validate(cancelOrderSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const order = await ordersService.rejectOrder(req.user!.id, req.params.id as string, req.body.reason);
      sendSuccess(res, { order });
    } catch (error) { next(error); }
  }
);

/** PATCH /api/v1/orders/:id/status — Update preparation status (merchant) */
router.patch(
  '/:id/status',
  authMiddleware,
  requireRoles(Role.MERCHANT),
  validate(updateOrderStatusSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const order = await ordersService.updateOrderStatus(req.user!.id, req.params.id as string, req.body.status);
      sendSuccess(res, { order });
    } catch (error) { next(error); }
  }
);

export default router;
