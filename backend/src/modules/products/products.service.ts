import { productsRepository } from './products.repository';
import { storesRepository } from '../stores/stores.repository';
import { CreateProductDto, UpdateProductDto, Product } from './products.types';
import { NotFoundError, AuthorizationError } from '../../common/errors';
import { cacheService } from '../../redis/cache.service';
import { CacheKeys, CacheTTL } from '../../common/constants/cache-keys';
import { logger } from '../../common/utils/logger';

export class ProductsService {
  async listProducts(filters: {
    storeId?: string;
    categoryId?: string;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
    sort?: string;
    page: number;
    limit: number;
  }) {
    // Cache store-specific product pages (non-filtered)
    if (filters.storeId && !filters.search && !filters.categoryId && filters.minPrice === undefined && filters.maxPrice === undefined) {
      const cached = await cacheService.get<{ products: Product[]; total: number }>(
        CacheKeys.productsByStore(filters.storeId, filters.page, filters.limit, filters.sort)
      );
      if (cached) return cached;
    }

    const result = await productsRepository.findAll(filters);

    if (filters.storeId && !filters.search && !filters.categoryId && filters.minPrice === undefined && filters.maxPrice === undefined) {
      await cacheService.set(
        CacheKeys.productsByStore(filters.storeId, filters.page, filters.limit, filters.sort),
        result,
        CacheTTL.PRODUCT_LIST
      );
    }

    return result;
  }

  async getProduct(id: string): Promise<Product> {
    const cached = await cacheService.get<Product>(CacheKeys.product(id));
    if (cached) return cached;

    const product = await productsRepository.findById(id);
    if (!product) throw new NotFoundError('Product');

    await cacheService.set(CacheKeys.product(id), product, CacheTTL.PRODUCT_DETAIL);
    return product;
  }

  async createProduct(userId: string, dto: CreateProductDto): Promise<Product> {
    // Verify merchant owns the store
    const merchantId = await storesRepository.getMerchantIdByUserId(userId);
    if (!merchantId) throw new NotFoundError('Merchant profile');

    const isOwner = await storesRepository.isOwnedByMerchant(dto.storeId, merchantId);
    if (!isOwner) {
      throw new AuthorizationError('You do not own this store', 'RESOURCE_NOT_OWNED');
    }

    const slug = this.generateSlug(dto.name);
    const product = await productsRepository.create(dto, slug);

    // Invalidate product list cache for this store
    await cacheService.delPattern(`products:store:${dto.storeId}:*`);

    logger.info({ productId: product.id, storeId: dto.storeId }, 'Product created');
    return product;
  }

  async updateProduct(userId: string, productId: string, dto: UpdateProductDto): Promise<Product> {
    const product = await productsRepository.findById(productId);
    if (!product) throw new NotFoundError('Product');

    const merchantId = await storesRepository.getMerchantIdByUserId(userId);
    if (!merchantId) throw new NotFoundError('Merchant profile');

    const isOwner = await storesRepository.isOwnedByMerchant(product.storeId, merchantId);
    if (!isOwner) {
      throw new AuthorizationError('You do not own this product', 'RESOURCE_NOT_OWNED');
    }

    const updated = await productsRepository.update(productId, dto);

    await cacheService.del(CacheKeys.product(productId));
    await cacheService.delPattern(`products:store:${product.storeId}:*`);

    logger.info({ productId }, 'Product updated');
    return updated;
  }

  async updateInventory(userId: string, productId: string, quantity: number, lowStock?: number): Promise<void> {
    const product = await productsRepository.findById(productId);
    if (!product) throw new NotFoundError('Product');

    const merchantId = await storesRepository.getMerchantIdByUserId(userId);
    if (!merchantId) throw new NotFoundError('Merchant profile');

    const isOwner = await storesRepository.isOwnedByMerchant(product.storeId, merchantId);
    if (!isOwner) {
      throw new AuthorizationError('You do not own this product', 'RESOURCE_NOT_OWNED');
    }

    await productsRepository.updateInventory(productId, quantity, lowStock);
    await cacheService.del(CacheKeys.product(productId));

    logger.info({ productId, quantity }, 'Inventory updated');
  }

  async deleteProduct(userId: string, productId: string): Promise<void> {
    const product = await productsRepository.findById(productId);
    if (!product) throw new NotFoundError('Product');

    const merchantId = await storesRepository.getMerchantIdByUserId(userId);
    if (!merchantId) throw new NotFoundError('Merchant profile');

    const isOwner = await storesRepository.isOwnedByMerchant(product.storeId, merchantId);
    if (!isOwner) {
      throw new AuthorizationError('You do not own this product', 'RESOURCE_NOT_OWNED');
    }

    await productsRepository.softDelete(productId);
    await cacheService.del(CacheKeys.product(productId));
    await cacheService.delPattern(`products:store:${product.storeId}:*`);

    logger.info({ productId }, 'Product soft-deleted');
  }

  private generateSlug(name: string): string {
    const base = name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();
    return `${base}-${Date.now().toString(36)}`;
  }
}

export const productsService = new ProductsService();
