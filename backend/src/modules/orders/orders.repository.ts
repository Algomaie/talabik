import { query, withTransaction } from '../../config/database';
import { ConflictError } from '../../common/errors';
import { Order, OrderItem } from './orders.types';

function mapOrderRow(row: any): Order {
  return {
    id: row.id,
    orderNumber: row.order_number,
    userId: row.user_id,
    storeId: row.store_id,
    storeName: row.store_name,
    addressId: row.address_id,
    status: row.status,
    subtotal: parseFloat(row.subtotal),
    deliveryFee: parseFloat(row.delivery_fee),
    tax: parseFloat(row.tax),
    total: parseFloat(row.total),
    notes: row.notes,
    cancelledBy: row.cancelled_by,
    cancelReason: row.cancel_reason,
    idempotencyKey: row.idempotency_key,
    confirmedAt: row.confirmed_at,
    preparingAt: row.preparing_at,
    readyAt: row.ready_at,
    pickedUpAt: row.picked_up_at,
    deliveredAt: row.delivered_at,
    cancelledAt: row.cancelled_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapItemRow(row: any): OrderItem {
  return {
    id: row.id,
    orderId: row.order_id,
    productId: row.product_id,
    productName: row.product_name,
    productPrice: parseFloat(row.product_price),
    quantity: row.quantity,
    total: parseFloat(row.total),
  };
}

export class OrdersRepository {
  async findById(id: string): Promise<Order | null> {
    const result = await query(
      `SELECT o.*, s.name as store_name
       FROM orders o
       JOIN stores s ON o.store_id = s.id
       WHERE o.id = $1`,
      [id]
    );
    if (result.rows.length === 0) return null;
    return mapOrderRow(result.rows[0]);
  }

  async findByIdempotencyKey(key: string): Promise<Order | null> {
    const result = await query(
      `SELECT o.*, s.name as store_name
       FROM orders o
       JOIN stores s ON o.store_id = s.id
       WHERE o.idempotency_key = $1`,
      [key]
    );
    if (result.rows.length === 0) return null;
    return mapOrderRow(result.rows[0]);
  }

  async findByUser(userId: string, status: string | undefined, page: number, limit: number): Promise<{ orders: Order[]; total: number }> {
    const params: any[] = [userId];
    let whereClause = 'WHERE o.user_id = $1';

    if (status) {
      params.push(status);
      whereClause += ` AND o.status = $${params.length}`;
    }

    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM orders o ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const offset = (page - 1) * limit;
    params.push(limit, offset);

    const dataResult = await query(
      `SELECT o.*, s.name as store_name
       FROM orders o
       JOIN stores s ON o.store_id = s.id
       ${whereClause}
       ORDER BY o.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return { orders: dataResult.rows.map(mapOrderRow), total };
  }

  async findByStore(storeId: string, status: string | undefined, page: number, limit: number): Promise<{ orders: Order[]; total: number }> {
    const params: any[] = [storeId];
    let whereClause = 'WHERE o.store_id = $1';

    if (status) {
      params.push(status);
      whereClause += ` AND o.status = $${params.length}`;
    }

    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM orders o ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const offset = (page - 1) * limit;
    params.push(limit, offset);

    const dataResult = await query(
      `SELECT o.*, s.name as store_name
       FROM orders o
       JOIN stores s ON o.store_id = s.id
       ${whereClause}
       ORDER BY o.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return { orders: dataResult.rows.map(mapOrderRow), total };
  }

  async getOrderItems(orderId: string): Promise<OrderItem[]> {
    const result = await query(
      'SELECT * FROM order_items WHERE order_id = $1 ORDER BY created_at ASC',
      [orderId]
    );
    return result.rows.map(mapItemRow);
  }

  async updateStatus(id: string, status: string, timestampField?: string, expectedStatus?: string): Promise<Order> {
    let extraSet = '';
    if (timestampField) {
      if (!['confirmed_at', 'preparing_at', 'ready_at', 'picked_up_at', 'delivered_at'].includes(timestampField)) throw new Error('Invalid timestamp column');
      extraSet = `, ${timestampField} = NOW()`;
    }

    const result = await query(
      `UPDATE orders SET status = $1, updated_at = NOW()${extraSet}
       WHERE id = $2 AND ($3::text IS NULL OR status = $3) RETURNING *`,
      [status, id, expectedStatus ?? null]
    );
    if (!result.rows.length) throw new ConflictError('Order status changed; reload and retry', 'ORDER_CHANGED');
    return mapOrderRow(result.rows[0]);
  }

  async cancelOrder(id: string, cancelledBy: string, reason: string, expectedStatus: string): Promise<Order> {
    return withTransaction(async (client) => {
    const result = await client.query(
      `UPDATE orders SET status = $5, cancelled_by = $1, cancel_reason = $2,
                         cancelled_at = NOW(), updated_at = NOW()
       WHERE id = $3 AND status = $4 RETURNING *`,
      [cancelledBy, reason, id, expectedStatus, cancelledBy === 'MERCHANT' ? 'REJECTED' : 'CANCELLED']
    );
    if (!result.rows.length) throw new ConflictError('Order status changed; reload and retry', 'ORDER_CHANGED');
    await client.query(`UPDATE inventory i SET quantity = i.quantity + oi.quantity, updated_at = NOW()
      FROM order_items oi WHERE oi.order_id = $1 AND oi.product_id = i.product_id`, [id]);
    await client.query("UPDATE deliveries SET status = 'FAILED', updated_at = NOW() WHERE order_id = $1 AND status = 'PENDING'", [id]);
    await client.query("UPDATE payments SET status = CASE WHEN status = 'SUCCESS' THEN 'REFUNDED' ELSE 'FAILED' END, updated_at = NOW() WHERE order_id = $1", [id]);
    return mapOrderRow(result.rows[0]);
    });
  }

  /**
   * Generate a human-readable order number: TLB-YYYYMMDD-NNNN
   */
  async generateOrderNumber(): Promise<string> {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');

    const result = await query<{ seq: string }>(
      "SELECT nextval('order_number_seq')::text as seq"
    );
    const seq = result.rows[0].seq.padStart(4, '0');

    return `TLB-${dateStr}-${seq}`;
  }
}

export const ordersRepository = new OrdersRepository();
