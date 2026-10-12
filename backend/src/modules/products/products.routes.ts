import { Router } from 'express';
import { productsController } from './products.controller';
import { validate } from '../../common/middleware/validation.middleware';
import { authMiddleware } from '../../common/middleware/auth.middleware';
import { requireRoles } from '../../common/middleware/rbac.middleware';
import { createProductSchema, updateProductSchema, updateInventorySchema } from './products.validation';
import { Role } from '../../common/constants/roles';

const router = Router();

/** GET /api/v1/products — List/search/filter products (public) */
router.get('/', (req, res, next) => productsController.list(req, res, next));

/** GET /api/v1/products/:id — Product details (public) */
router.get('/:id', (req, res, next) => productsController.getById(req, res, next));

/** POST /api/v1/products — Create product (merchant only) */
router.post(
  '/',
  authMiddleware,
  requireRoles(Role.MERCHANT),
  validate(createProductSchema),
  (req, res, next) => productsController.create(req, res, next)
);

/** PATCH /api/v1/products/:id — Update product (merchant owner) */
router.patch(
  '/:id',
  authMiddleware,
  requireRoles(Role.MERCHANT),
  validate(updateProductSchema),
  (req, res, next) => productsController.update(req, res, next)
);

/** PATCH /api/v1/products/:id/inventory — Update inventory (merchant owner) */
router.patch(
  '/:id/inventory',
  authMiddleware,
  requireRoles(Role.MERCHANT),
  validate(updateInventorySchema),
  (req, res, next) => productsController.updateInventory(req, res, next)
);

/** DELETE /api/v1/products/:id — Soft delete (merchant owner) */
router.delete(
  '/:id',
  authMiddleware,
  requireRoles(Role.MERCHANT),
  (req, res, next) => productsController.delete(req, res, next)
);

export default router;
