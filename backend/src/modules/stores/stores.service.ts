import { storesRepository } from './stores.repository';
import { CreateStoreDto, UpdateStoreDto, Store } from './stores.types';
import { NotFoundError, AuthorizationError, ConflictError } from '../../common/errors';
import { cacheService } from '../../redis/cache.service';
import { CacheKeys, CacheTTL } from '../../common/constants/cache-keys';
import { logger } from '../../common/utils/logger';

export class StoresService {
  /**
   * List active stores with optional search, paginated.
   * Implements Cache-Aside pattern.
   */
  async listStores(page: number, limit: number, search?: string) {
    // Only cache non-search requests
    if (!search) {
      const cached = await cacheService.get<{ stores: Store[]; total: number }>(
        CacheKeys.storesList(page)
      );
      if (cached) return cached;
    }

    const result = await storesRepository.findAll(page, limit, search);

    // Cache the result
    if (!search) {
      await cacheService.set(CacheKeys.storesList(page), result, CacheTTL.STORE_LIST);
    }

    return result;
  }

  /**
   * Get single store by ID.
   */
  async getStore(id: string): Promise<Store> {
    // Check cache first
    const cached = await cacheService.get<Store>(CacheKeys.store(id));
    if (cached) return cached;

    const store = await storesRepository.findById(id);
    if (!store) {
      throw new NotFoundError('Store');
    }

    await cacheService.set(CacheKeys.store(id), store, CacheTTL.STORE_DETAIL);
    return store;
  }

  /**
   * Get stores owned by a merchant (identified by user ID).
   */
  async getMerchantStores(userId: string): Promise<Store[]> {
    const merchantId = await storesRepository.getMerchantIdByUserId(userId);
    if (!merchantId) {
      throw new NotFoundError('Merchant profile');
    }
    return storesRepository.findByMerchantId(merchantId);
  }

  /**
   * Create a new store for a merchant.
   */
  async createStore(userId: string, dto: CreateStoreDto): Promise<Store> {
    const merchantId = await storesRepository.getMerchantIdByUserId(userId);
    if (!merchantId) {
      throw new NotFoundError('Merchant profile');
    }

    // Generate slug from name
    const slug = this.generateSlug(dto.name);

    // Check slug uniqueness
    const existing = await storesRepository.findBySlug(slug);
    if (existing) {
      throw new ConflictError('A store with this name already exists', 'STORE_SLUG_CONFLICT');
    }

    const store = await storesRepository.create(merchantId, dto, slug);

    // Invalidate store list cache
    await cacheService.delPattern('stores:list:*');

    logger.info({ storeId: store.id, merchantId }, 'Store created');
    return store;
  }

  /**
   * Update a store. Merchant must own it.
   */
  async updateStore(userId: string, storeId: string, dto: UpdateStoreDto): Promise<Store> {
    const merchantId = await storesRepository.getMerchantIdByUserId(userId);
    if (!merchantId) {
      throw new NotFoundError('Merchant profile');
    }

    // Verify ownership
    const isOwner = await storesRepository.isOwnedByMerchant(storeId, merchantId);
    if (!isOwner) {
      throw new AuthorizationError(
        'You do not own this store',
        'RESOURCE_NOT_OWNED'
      );
    }

    const store = await storesRepository.update(storeId, dto);

    // Invalidate cache
    await cacheService.del(CacheKeys.store(storeId));
    await cacheService.delPattern('stores:list:*');

    logger.info({ storeId, merchantId }, 'Store updated');
    return store;
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }
}

export const storesService = new StoresService();
