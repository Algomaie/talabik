import { Router, Request, Response, NextFunction } from 'express';
import { cartService } from './cart.service';
import { validate } from '../../common/middleware/validation.middleware';
import { authMiddleware } from '../../common/middleware/auth.middleware';
import { addCartItemSchema, updateCartItemSchema } from './cart.validation';
import { sendSuccess } from '../../common/utils/response';

const router = Router();

/** GET /api/v1/cart — Get current cart */
router.get('/', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cart = await cartService.getCart(req.user!.id);
    sendSuccess(res, { cart });
  } catch (error) { next(error); }
});

/** POST /api/v1/cart/items — Add item to cart */
router.post(
  '/items',
  authMiddleware,
  validate(addCartItemSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { productId, quantity } = req.body;
      const cart = await cartService.addItem(req.user!.id, productId, quantity);
      sendSuccess(res, { cart }, 201);
    } catch (error) { next(error); }
  }
);

/** PATCH /api/v1/cart/items/:id — Update item quantity */
router.patch(
  '/items/:id',
  authMiddleware,
  validate(updateCartItemSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const cart = await cartService.updateItem(req.user!.id, req.params.id as string, req.body.quantity);
      sendSuccess(res, { cart });
    } catch (error) { next(error); }
  }
);

/** DELETE /api/v1/cart/items/:id — Remove item */
router.delete(
  '/items/:id',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const cart = await cartService.removeItem(req.user!.id, req.params.id as string);
      sendSuccess(res, { cart });
    } catch (error) { next(error); }
  }
);

/** DELETE /api/v1/cart — Clear cart */
router.delete('/', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cart = await cartService.clearCart(req.user!.id);
    sendSuccess(res, { cart });
  } catch (error) { next(error); }
});

export default router;
