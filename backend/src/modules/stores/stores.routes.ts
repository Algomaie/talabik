import { Router } from 'express';
import { storesController } from './stores.controller';
import { validate } from '../../common/middleware/validation.middleware';
import { authMiddleware } from '../../common/middleware/auth.middleware';
import { requireRoles } from '../../common/middleware/rbac.middleware';
import { createStoreSchema, updateStoreSchema } from './stores.validation';
import { Role } from '../../common/constants/roles';

const router = Router();

/** GET /api/v1/stores — List active stores (public) */
router.get('/', (req, res, next) => storesController.list(req, res, next));

/** GET /api/v1/stores/my — Merchant's own stores */
router.get(
  '/my',
  authMiddleware,
  requireRoles(Role.MERCHANT),
  (req, res, next) => storesController.myStores(req, res, next)
);

/** GET /api/v1/stores/:id — Store details (public) */
router.get('/:id', (req, res, next) => storesController.getById(req, res, next));

/** POST /api/v1/stores — Create store (merchant only) */
router.post(
  '/',
  authMiddleware,
  requireRoles(Role.MERCHANT),
  validate(createStoreSchema),
  (req, res, next) => storesController.create(req, res, next)
);

/** PATCH /api/v1/stores/:id — Update store (merchant owner) */
router.patch(
  '/:id',
  authMiddleware,
  requireRoles(Role.MERCHANT),
  validate(updateStoreSchema),
  (req, res, next) => storesController.update(req, res, next)
);

export default router;
