import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import { categoriesService } from './categories.service';
import { validate } from '../../common/middleware/validation.middleware';
import { authMiddleware } from '../../common/middleware/auth.middleware';
import { requireRoles } from '../../common/middleware/rbac.middleware';
import { createCategorySchema, updateCategorySchema } from './categories.validation';
import { Role } from '../../common/constants/roles';
import { sendSuccess } from '../../common/utils/response';

const router = Router();

/** GET /api/v1/stores/:storeId/categories — List store categories (public) */
router.get('/stores/:storeId/categories', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await categoriesService.listByStore(req.params.storeId as string);
    sendSuccess(res, { categories });
  } catch (error) { next(error); }
});

/** POST /api/v1/categories — Create category (merchant) */
router.post(
  '/',
  authMiddleware,
  requireRoles(Role.MERCHANT),
  validate(createCategorySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { storeId, name, description, sortOrder } = req.body;
      const category = await categoriesService.create(req.user!.id, storeId, name, description, sortOrder);
      sendSuccess(res, { category }, 201);
    } catch (error) { next(error); }
  }
);

/** PATCH /api/v1/categories/:id — Update category (merchant owner) */
router.patch(
  '/:id',
  authMiddleware,
  requireRoles(Role.MERCHANT),
  validate(updateCategorySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const category = await categoriesService.update(req.user!.id, req.params.id as string, req.body);
      sendSuccess(res, { category });
    } catch (error) { next(error); }
  }
);

/** DELETE /api/v1/categories/:id — Delete category (merchant owner) */
router.delete(
  '/:id',
  authMiddleware,
  requireRoles(Role.MERCHANT),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await categoriesService.delete(req.user!.id, req.params.id as string);
      sendSuccess(res, { message: 'Category deleted' });
    } catch (error) { next(error); }
  }
);

export default router;
