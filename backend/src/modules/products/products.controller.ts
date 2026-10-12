import { Request, Response, NextFunction } from 'express';
import { productsService } from './products.service';
import { sendSuccess, sendPaginated } from '../../common/utils/response';
import { parsePagination } from '../../common/utils/pagination';

export class ProductsController {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit } = parsePagination(req.query as any);
      const { storeId, categoryId, search, minPrice, maxPrice, sort } = req.query as any;

      const { products, total } = await productsService.listProducts({
        storeId, categoryId, search,
        minPrice: minPrice ? parseFloat(minPrice) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
        sort, page, limit,
      });

      sendPaginated(res, products, total, page, limit);
    } catch (error) { next(error); }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const product = await productsService.getProduct(req.params.id as string);
      sendSuccess(res, { product });
    } catch (error) { next(error); }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const product = await productsService.createProduct(req.user!.id, req.body);
      sendSuccess(res, { product }, 201);
    } catch (error) { next(error); }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const product = await productsService.updateProduct(req.user!.id, req.params.id as string, req.body);
      sendSuccess(res, { product });
    } catch (error) { next(error); }
  }

  async updateInventory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { quantity, lowStock } = req.body;
      await productsService.updateInventory(req.user!.id, req.params.id as string, quantity, lowStock);
      sendSuccess(res, { message: 'Inventory updated' });
    } catch (error) { next(error); }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await productsService.deleteProduct(req.user!.id, req.params.id as string);
      sendSuccess(res, { message: 'Product deleted' });
    } catch (error) { next(error); }
  }
}

export const productsController = new ProductsController();
