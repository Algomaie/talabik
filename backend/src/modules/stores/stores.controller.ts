import { Request, Response, NextFunction } from 'express';
import { storesService } from './stores.service';
import { sendSuccess, sendPaginated } from '../../common/utils/response';
import { parsePagination } from '../../common/utils/pagination';

export class StoresController {
  /**
   * GET /api/v1/stores
   */
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit } = parsePagination(req.query as any);
      const search = req.query.search as string | undefined;

      const { stores, total } = await storesService.listStores(page, limit, search);
      sendPaginated(res, stores, total, page, limit);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/stores/:id
   */
  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const store = await storesService.getStore(req.params.id as string);
      sendSuccess(res, { store });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/stores
   */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const store = await storesService.createStore(req.user!.id, req.body);
      sendSuccess(res, { store }, 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/stores/:id
   */
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const store = await storesService.updateStore(req.user!.id, req.params.id as string, req.body);
      sendSuccess(res, { store });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/stores/my
   * Merchant's own stores
   */
  async myStores(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stores = await storesService.getMerchantStores(req.user!.id);
      sendSuccess(res, { stores });
    } catch (error) {
      next(error);
    }
  }
}

export const storesController = new StoresController();
