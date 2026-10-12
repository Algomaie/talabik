import { query } from '../../config/database';
import { Store, CreateStoreDto, UpdateStoreDto } from './stores.types';

function mapRow(row: any): Store {
  return {
    id: row.id,
    merchantId: row.merchant_id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    logoUrl: row.logo_url,
    coverUrl: row.cover_url,
    phone: row.phone,
    email: row.email,
    address: row.address,
    latitude: row.latitude ? parseFloat(row.latitude) : null,
    longitude: row.longitude ? parseFloat(row.longitude) : null,
    isActive: row.is_active,
    opensAt: row.opens_at,
    closesAt: row.closes_at,
    minOrder: parseFloat(row.min_order || '0'),
    deliveryFee: parseFloat(row.delivery_fee || '0'),
    avgRating: parseFloat(row.avg_rating || '0'),
    totalRatings: row.total_ratings || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class StoresRepository {
  async findAll(
    page: number,
    limit: number,
    search?: string
  ): Promise<{ stores: Store[]; total: number }> {
    const offset = (page - 1) * limit;
    const params: any[] = [];
    let whereClause = 'WHERE s.is_active = true';

    if (search) {
      params.push(`%${search}%`);
      whereClause += ` AND (s.name ILIKE $${params.length} OR s.description ILIKE $${params.length})`;
    }

    // Count query
    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM stores s ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Data query
    params.push(limit, offset);
    const dataResult = await query(
      `SELECT s.* FROM stores s
       ${whereClause}
       ORDER BY s.avg_rating DESC, s.name ASC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return { stores: dataResult.rows.map(mapRow), total };
  }

  async findById(id: string): Promise<Store | null> {
    const result = await query('SELECT * FROM stores WHERE id = $1', [id]);
    if (result.rows.length === 0) return null;
    return mapRow(result.rows[0]);
  }

  async findBySlug(slug: string): Promise<Store | null> {
    const result = await query('SELECT * FROM stores WHERE slug = $1', [slug]);
    if (result.rows.length === 0) return null;
    return mapRow(result.rows[0]);
  }

  async findByMerchantId(merchantId: string): Promise<Store[]> {
    const result = await query(
      'SELECT * FROM stores WHERE merchant_id = $1 ORDER BY created_at DESC',
      [merchantId]
    );
    return result.rows.map(mapRow);
  }

  async getMerchantIdByUserId(userId: string): Promise<string | null> {
    const result = await query<{ id: string }>(
      'SELECT id FROM merchants WHERE user_id = $1',
      [userId]
    );
    return result.rows[0]?.id ?? null;
  }

  async create(merchantId: string, dto: CreateStoreDto, slug: string): Promise<Store> {
    const result = await query(
      `INSERT INTO stores (merchant_id, name, slug, description, phone, email, address,
                           latitude, longitude, opens_at, closes_at, min_order, delivery_fee)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        merchantId, dto.name, slug, dto.description ?? null,
        dto.phone ?? null, dto.email ?? null, dto.address ?? null,
        dto.latitude ?? null, dto.longitude ?? null,
        dto.opensAt ?? null, dto.closesAt ?? null,
        dto.minOrder ?? 0, dto.deliveryFee ?? 0,
      ]
    );
    return mapRow(result.rows[0]);
  }

  async update(id: string, dto: UpdateStoreDto): Promise<Store> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    const fieldMap: Record<string, string> = {
      name: 'name', description: 'description', phone: 'phone',
      email: 'email', address: 'address', latitude: 'latitude',
      longitude: 'longitude', isActive: 'is_active',
      opensAt: 'opens_at', closesAt: 'closes_at',
      minOrder: 'min_order', deliveryFee: 'delivery_fee',
    };

    for (const [key, column] of Object.entries(fieldMap)) {
      const value = (dto as any)[key];
      if (value !== undefined) {
        fields.push(`${column} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await query(
      `UPDATE stores SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    return mapRow(result.rows[0]);
  }

  /**
   * Check if merchant owns a specific store.
   */
  async isOwnedByMerchant(storeId: string, merchantId: string): Promise<boolean> {
    const result = await query<{ exists: boolean }>(
      'SELECT EXISTS(SELECT 1 FROM stores WHERE id = $1 AND merchant_id = $2) as exists',
      [storeId, merchantId]
    );
    return result.rows[0].exists;
  }
}

export const storesRepository = new StoresRepository();
