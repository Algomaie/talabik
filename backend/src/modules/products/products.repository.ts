import { query, withTransaction } from '../../config/database';
import { Product, CreateProductDto, UpdateProductDto } from './products.types';

function mapRow(row: any): Product {
  return {
    id: row.id,
    storeId: row.store_id,
    categoryId: row.category_id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    price: parseFloat(row.price),
    comparePrice: row.compare_price ? parseFloat(row.compare_price) : null,
    imageUrl: row.image_url,
    isActive: row.is_active,
    sortOrder: row.sort_order || 0,
    quantity: row.quantity ?? 0,
    lowStock: row.low_stock ?? 5,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class ProductsRepository {
  async findAll(filters: {
    storeId?: string;
    categoryId?: string;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
    sort?: string;
    page: number;
    limit: number;
  }): Promise<{ products: Product[]; total: number }> {
    const params: any[] = [];
    const conditions: string[] = ['p.is_active = true'];

    if (filters.storeId) {
      params.push(filters.storeId);
      conditions.push(`p.store_id = $${params.length}`);
    }
    if (filters.categoryId) {
      params.push(filters.categoryId);
      conditions.push(`p.category_id = $${params.length}`);
    }
    if (filters.search) {
      params.push(`%${filters.search}%`);
      conditions.push(`(p.name ILIKE $${params.length} OR p.description ILIKE $${params.length})`);
    }
    if (filters.minPrice !== undefined) {
      params.push(filters.minPrice);
      conditions.push(`p.price >= $${params.length}`);
    }
    if (filters.maxPrice !== undefined) {
      params.push(filters.maxPrice);
      conditions.push(`p.price <= $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count
    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM products p ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Sort
    let orderBy = 'p.sort_order ASC, p.name ASC';
    switch (filters.sort) {
      case 'price': orderBy = 'p.price ASC'; break;
      case '-price': orderBy = 'p.price DESC'; break;
      case 'name': orderBy = 'p.name ASC'; break;
      case '-name': orderBy = 'p.name DESC'; break;
      case 'created': orderBy = 'p.created_at DESC'; break;
    }

    const offset = (filters.page - 1) * filters.limit;
    params.push(filters.limit, offset);

    const dataResult = await query(
      `SELECT p.*, i.quantity, i.low_stock
       FROM products p
       LEFT JOIN inventory i ON p.id = i.product_id
       ${whereClause}
       ORDER BY ${orderBy}
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return { products: dataResult.rows.map(mapRow), total };
  }

  async findById(id: string): Promise<Product | null> {
    const result = await query(
      `SELECT p.*, i.quantity, i.low_stock
       FROM products p
       LEFT JOIN inventory i ON p.id = i.product_id
       WHERE p.id = $1`,
      [id]
    );
    if (result.rows.length === 0) return null;
    return mapRow(result.rows[0]);
  }

  async findByIds(ids: string[]): Promise<Product[]> {
    if (ids.length === 0) return [];
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
    const result = await query(
      `SELECT p.*, i.quantity, i.low_stock
       FROM products p
       LEFT JOIN inventory i ON p.id = i.product_id
       WHERE p.id IN (${placeholders})`,
      ids
    );
    return result.rows.map(mapRow);
  }

  async create(dto: CreateProductDto, slug: string): Promise<Product> {
    return withTransaction(async (client) => {
      const prodResult = await client.query(
        `INSERT INTO products (store_id, category_id, name, slug, description, price, compare_price, image_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          dto.storeId, dto.categoryId ?? null, dto.name, slug,
          dto.description ?? null, dto.price, dto.comparePrice ?? null,
          dto.imageUrl ?? null,
        ]
      );

      const productId = prodResult.rows[0].id;

      await client.query(
        `INSERT INTO inventory (product_id, quantity, low_stock) VALUES ($1, $2, $3)`,
        [productId, dto.quantity ?? 0, dto.lowStock ?? 5]
      );

      const result = await client.query(
        `SELECT p.*, i.quantity, i.low_stock
         FROM products p
         LEFT JOIN inventory i ON p.id = i.product_id
         WHERE p.id = $1`,
        [productId]
      );

      return mapRow(result.rows[0]);
    });
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    const fieldMap: Record<string, string> = {
      categoryId: 'category_id', name: 'name', description: 'description',
      price: 'price', comparePrice: 'compare_price', imageUrl: 'image_url',
      isActive: 'is_active', sortOrder: 'sort_order',
    };

    for (const [key, column] of Object.entries(fieldMap)) {
      const value = (dto as any)[key];
      if (value !== undefined) {
        fields.push(`${column} = $${idx}`);
        values.push(value);
        idx++;
      }
    }

    if (fields.length === 0) {
      const existing = await this.findById(id);
      return existing!;
    }

    fields.push('updated_at = NOW()');
    values.push(id);

    await query(
      `UPDATE products SET ${fields.join(', ')} WHERE id = $${idx}`,
      values
    );

    return (await this.findById(id))!;
  }

  async updateInventory(productId: string, quantity: number, lowStock?: number): Promise<void> {
    if (lowStock !== undefined) {
      await query(
        'UPDATE inventory SET quantity = $1, low_stock = $2, updated_at = NOW() WHERE product_id = $3',
        [quantity, lowStock, productId]
      );
    } else {
      await query(
        'UPDATE inventory SET quantity = $1, updated_at = NOW() WHERE product_id = $2',
        [quantity, productId]
      );
    }
  }

  async softDelete(id: string): Promise<void> {
    await query(
      'UPDATE products SET is_active = false, updated_at = NOW() WHERE id = $1',
      [id]
    );
  }

  /**
   * Check if product belongs to a specific store.
   */
  async belongsToStore(productId: string, storeId: string): Promise<boolean> {
    const result = await query<{ exists: boolean }>(
      'SELECT EXISTS(SELECT 1 FROM products WHERE id = $1 AND store_id = $2) as exists',
      [productId, storeId]
    );
    return result.rows[0].exists;
  }

  /**
   * Get store_id for a product.
   */
  async getStoreId(productId: string): Promise<string | null> {
    const result = await query<{ store_id: string }>(
      'SELECT store_id FROM products WHERE id = $1',
      [productId]
    );
    return result.rows[0]?.store_id ?? null;
  }
}

export const productsRepository = new ProductsRepository();
