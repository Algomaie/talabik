import { query } from '../../config/database';
import { storesRepository } from '../stores/stores.repository';
import { NotFoundError, AuthorizationError } from '../../common/errors';
import { logger } from '../../common/utils/logger';

export interface Category {
  id: string;
  storeId: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

function mapRow(row: any): Category {
  return {
    id: row.id,
    storeId: row.store_id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    sortOrder: row.sort_order || 0,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class CategoriesService {
  async listByStore(storeId: string): Promise<Category[]> {
    const result = await query(
      'SELECT * FROM categories WHERE store_id = $1 AND is_active = true ORDER BY sort_order ASC, name ASC',
      [storeId]
    );
    return result.rows.map(mapRow);
  }

  async getById(id: string): Promise<Category> {
    const result = await query('SELECT * FROM categories WHERE id = $1', [id]);
    if (result.rows.length === 0) throw new NotFoundError('Category');
    return mapRow(result.rows[0]);
  }

  async create(userId: string, storeId: string, name: string, description?: string, sortOrder?: number): Promise<Category> {
    const merchantId = await storesRepository.getMerchantIdByUserId(userId);
    if (!merchantId) throw new NotFoundError('Merchant profile');

    const isOwner = await storesRepository.isOwnedByMerchant(storeId, merchantId);
    if (!isOwner) throw new AuthorizationError('You do not own this store', 'RESOURCE_NOT_OWNED');

    const slug = name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').trim();

    const result = await query(
      `INSERT INTO categories (store_id, name, slug, description, sort_order)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [storeId, name, slug, description ?? null, sortOrder ?? 0]
    );

    logger.info({ categoryId: result.rows[0].id, storeId }, 'Category created');
    return mapRow(result.rows[0]);
  }

  async update(userId: string, id: string, data: { name?: string; description?: string; sortOrder?: number; isActive?: boolean }): Promise<Category> {
    const category = await this.getById(id);

    const merchantId = await storesRepository.getMerchantIdByUserId(userId);
    if (!merchantId) throw new NotFoundError('Merchant profile');

    const isOwner = await storesRepository.isOwnedByMerchant(category.storeId, merchantId);
    if (!isOwner) throw new AuthorizationError('You do not own this category', 'RESOURCE_NOT_OWNED');

    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (data.name !== undefined) { fields.push(`name = $${idx}`); values.push(data.name); idx++; }
    if (data.description !== undefined) { fields.push(`description = $${idx}`); values.push(data.description); idx++; }
    if (data.sortOrder !== undefined) { fields.push(`sort_order = $${idx}`); values.push(data.sortOrder); idx++; }
    if (data.isActive !== undefined) { fields.push(`is_active = $${idx}`); values.push(data.isActive); idx++; }

    if (fields.length === 0) return category;

    fields.push('updated_at = NOW()');
    values.push(id);

    const result = await query(
      `UPDATE categories SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    logger.info({ categoryId: id }, 'Category updated');
    return mapRow(result.rows[0]);
  }

  async delete(userId: string, id: string): Promise<void> {
    const category = await this.getById(id);

    const merchantId = await storesRepository.getMerchantIdByUserId(userId);
    if (!merchantId) throw new NotFoundError('Merchant profile');

    const isOwner = await storesRepository.isOwnedByMerchant(category.storeId, merchantId);
    if (!isOwner) throw new AuthorizationError('You do not own this category', 'RESOURCE_NOT_OWNED');

    await query('DELETE FROM categories WHERE id = $1', [id]);
    logger.info({ categoryId: id }, 'Category deleted');
  }
}

export const categoriesService = new CategoriesService();
