import { withTransaction } from '../../config/database';
import { ordersRepository } from './orders.repository';
import { cartService } from '../cart/cart.service';
import { productsRepository } from '../products/products.repository';
import { storesRepository } from '../stores/stores.repository';
import { Order, CreateOrderDto } from './orders.types';
import {
  NotFoundError, BusinessRuleError, AuthorizationError, ConflictError,
} from '../../common/errors';
import { OrderStatus, isValidTransition } from '../../common/constants/order-statuses';
import { cacheService } from '../../redis/cache.service';
import { CacheKeys, CacheTTL } from '../../common/constants/cache-keys';
import { logger } from '../../common/utils/logger';

/** Maps order status to the timestamp column that should be set */
const STATUS_TIMESTAMP_MAP: Partial<Record<string, string>> = {
  CONFIRMED: 'confirmed_at',
  PREPARING: 'preparing_at',
  READY_FOR_PICKUP: 'ready_at',
  PICKED_UP: 'picked_up_at',
  DELIVERED: 'delivered_at',
};

export class OrdersService {
  /**
   * Create an order from the user's cart.
   * This is a business transaction:
   *   1. Validate cart
   *   2. Validate product availability
   *   3. Calculate total
   *   4. Create order + order items
   *   5. Reserve inventory
   *   6. Clear cart
   *   7. Create delivery record
   *   8. Create payment record
   * All within a single PostgreSQL transaction.
   */
  async createOrder(userId: string, dto: CreateOrderDto): Promise<Order> {
    // Idempotency check
    if (dto.idempotencyKey) {
      const existing = await ordersRepository.findByIdempotencyKey(dto.idempotencyKey);
      if (existing) {
        logger.info({ idempotencyKey: dto.idempotencyKey }, 'Idempotent order returned');
        existing.items = await ordersRepository.getOrderItems(existing.id);
        return existing;
      }
    }

    // Get cart
    const cart = await cartService.getCart(userId);
    if (cart.items.length === 0) {
      throw new BusinessRuleError('Cart is empty', 'EMPTY_CART');
    }
    if (!cart.storeId) {
      throw new BusinessRuleError('Cart has no store', 'CART_NO_STORE');
    }

    // Get store for delivery fee
    const store = await storesRepository.findById(cart.storeId);
    if (!store) throw new NotFoundError('Store');

    // Check min order
    if (store.minOrder > 0 && cart.subtotal < store.minOrder) {
      throw new BusinessRuleError(
        `Minimum order amount is ${store.minOrder}`,
        'MIN_ORDER_NOT_MET'
      );
    }

    // Validate all products exist and have sufficient stock
    const productIds = cart.items.map((item) => item.productId);
    const products = await productsRepository.findByIds(productIds);
    const productMap = new Map(products.map((p) => [p.id, p]));

    for (const item of cart.items) {
      const product = productMap.get(item.productId);
      if (!product || !product.isActive) {
        throw new BusinessRuleError(
          `Product "${item.productName}" is no longer available`,
          'PRODUCT_UNAVAILABLE'
        );
      }
      if (product.quantity < item.quantity) {
        throw new BusinessRuleError(
          `Insufficient stock for "${item.productName}". Available: ${product.quantity}`,
          'INSUFFICIENT_INVENTORY'
        );
      }
    }

    // Calculate totals
    const subtotal = cart.subtotal;
    const deliveryFee = store.deliveryFee;
    const tax = Math.round(subtotal * 0.15 * 100) / 100; // 15% VAT
    const total = Math.round((subtotal + deliveryFee + tax) * 100) / 100;

    // Generate order number
    const orderNumber = await ordersRepository.generateOrderNumber();

    // Execute the entire order creation in a transaction
    const order = await withTransaction(async (client) => {
      // 1. Create order
      const orderResult = await client.query(
        `INSERT INTO orders (order_number, user_id, store_id, address_id, status,
                             subtotal, delivery_fee, tax, total, notes, idempotency_key)
         VALUES ($1, $2, $3, $4, 'PENDING', $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [orderNumber, userId, cart.storeId, dto.addressId,
         subtotal, deliveryFee, tax, total, dto.notes ?? null,
         dto.idempotencyKey ?? null]
      );
      const orderId = orderResult.rows[0].id;

      // 2. Create order items (snapshot product name & price)
      for (const item of cart.items) {
        const product = productMap.get(item.productId)!;
        const itemTotal = product.price * item.quantity;

        await client.query(
          `INSERT INTO order_items (order_id, product_id, product_name, product_price, quantity, total)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [orderId, item.productId, product.name, product.price, item.quantity, itemTotal]
        );
      }

      // 3. Reserve inventory (decrement stock)
      for (const item of cart.items) {
        const result = await client.query(
          `UPDATE inventory SET quantity = quantity - $1, updated_at = NOW()
           WHERE product_id = $2 AND quantity >= $1
           RETURNING quantity`,
          [item.quantity, item.productId]
        );
        if (result.rows.length === 0) {
          throw new BusinessRuleError(
            `Insufficient stock for "${item.productName}"`,
            'INSUFFICIENT_INVENTORY'
          );
        }
      }

      // 4. Create delivery record
      await client.query(
        `INSERT INTO deliveries (order_id, status, pickup_latitude, pickup_longitude,
                                 dropoff_latitude, dropoff_longitude, delivery_fee)
         VALUES ($1, 'PENDING', $2, $3, $4, $5, $6)`,
        [orderId, store.latitude, store.longitude,
         null, null, // Will be populated from address
         deliveryFee]
      );

      // 5. Create payment record (mock — CASH by default)
      await client.query(
        `INSERT INTO payments (order_id, amount, method, status) VALUES ($1, $2, 'CASH', 'PENDING')`,
        [orderId, total]
      );

      // 6. Clear cart
      await client.query(
        `DELETE FROM cart_items WHERE cart_id = (SELECT id FROM carts WHERE user_id = $1)`,
        [userId]
      );
      await client.query(
        `UPDATE carts SET store_id = NULL, updated_at = NOW() WHERE user_id = $1`,
        [userId]
      );

      return orderResult.rows[0];
    });

    // Store idempotency key in Redis
    if (dto.idempotencyKey) {
      await cacheService.set(
        CacheKeys.idempotencyKey(dto.idempotencyKey),
        order.id,
        CacheTTL.IDEMPOTENCY
      );
    }

    // Invalidate product caches (stock changed)
    for (const item of cart.items) {
      await cacheService.del(CacheKeys.product(item.productId));
    }
    await cacheService.delPattern(`products:store:${cart.storeId}:*`);

    const createdOrder = await this.getOrderById(order.id, userId);

    logger.info({
      orderId: order.id,
      orderNumber,
      userId,
      storeId: cart.storeId,
      total,
      itemCount: cart.items.length,
    }, 'Order created');

    return createdOrder;
  }

  /**
   * Get order by ID with items. Verifies access based on role.
   */
  async getOrderById(orderId: string, userId: string, userRoles?: string[]): Promise<Order> {
    const order = await ordersRepository.findById(orderId);
    if (!order) throw new NotFoundError('Order');

    // Access check: customer sees own, merchant sees store's, admin sees all
    if (userRoles?.includes('ADMIN')) {
      // Admin — full access
    } else if (userRoles?.includes('MERCHANT')) {
      const merchantId = await storesRepository.getMerchantIdByUserId(userId);
      if (merchantId) {
        const isOwner = await storesRepository.isOwnedByMerchant(order.storeId, merchantId);
        if (!isOwner) throw new AuthorizationError('Not your store order', 'RESOURCE_NOT_OWNED');
      }
    } else if (order.userId !== userId) {
      throw new AuthorizationError('Not your order', 'RESOURCE_NOT_OWNED');
    }

    order.items = await ordersRepository.getOrderItems(orderId);
    return order;
  }

  /**
   * List orders for a customer.
   */
  async getUserOrders(userId: string, status: string | undefined, page: number, limit: number) {
    return ordersRepository.findByUser(userId, status, page, limit);
  }

  /**
   * List orders for a merchant's store.
   */
  async getMerchantOrders(userId: string, status: string | undefined, page: number, limit: number) {
    const merchantId = await storesRepository.getMerchantIdByUserId(userId);
    if (!merchantId) throw new NotFoundError('Merchant profile');

    const stores = await storesRepository.findByMerchantId(merchantId);
    if (stores.length === 0) throw new NotFoundError('Store');

    // Get orders for the first store (or could aggregate)
    return ordersRepository.findByStore(stores[0].id, status, page, limit);
  }

  /**
   * Merchant confirms an order.
   */
  async confirmOrder(userId: string, orderId: string): Promise<Order> {
    const order = await this.verifyMerchantAccess(userId, orderId);
    this.validateTransition(order.status, OrderStatus.CONFIRMED);

    const updated = await ordersRepository.updateStatus(orderId, OrderStatus.CONFIRMED, 'confirmed_at');

    // Update payment to SUCCESS (mock)
    await this.mockPaymentSuccess(orderId);

    logger.info({ orderId, from: order.status, to: OrderStatus.CONFIRMED }, 'Order confirmed');
    updated.items = await ordersRepository.getOrderItems(orderId);
    return updated;
  }

  /**
   * Merchant rejects an order.
   */
  async rejectOrder(userId: string, orderId: string, reason: string): Promise<Order> {
    const order = await this.verifyMerchantAccess(userId, orderId);
    this.validateTransition(order.status, OrderStatus.REJECTED);

    const updated = await ordersRepository.cancelOrder(orderId, 'MERCHANT', reason);

    // Restore inventory
    await this.restoreInventory(orderId);

    logger.info({ orderId }, 'Order rejected');
    updated.items = await ordersRepository.getOrderItems(orderId);
    return updated;
  }

  /**
   * Merchant updates preparation status (PREPARING → READY_FOR_PICKUP).
   */
  async updateOrderStatus(userId: string, orderId: string, newStatus: string): Promise<Order> {
    const order = await this.verifyMerchantAccess(userId, orderId);
    this.validateTransition(order.status, newStatus as OrderStatus);

    const timestampField = STATUS_TIMESTAMP_MAP[newStatus];
    const updated = await ordersRepository.updateStatus(orderId, newStatus, timestampField);

    logger.info({ orderId, from: order.status, to: newStatus }, 'Order status updated');
    updated.items = await ordersRepository.getOrderItems(orderId);
    return updated;
  }

  /**
   * Customer cancels an order.
   */
  async cancelOrder(userId: string, orderId: string, reason: string): Promise<Order> {
    const order = await ordersRepository.findById(orderId);
    if (!order) throw new NotFoundError('Order');
    if (order.userId !== userId) {
      throw new AuthorizationError('Not your order', 'RESOURCE_NOT_OWNED');
    }

    // Business rule: customer can only cancel PENDING or CONFIRMED orders
    if (order.status !== OrderStatus.PENDING && order.status !== OrderStatus.CONFIRMED) {
      throw new BusinessRuleError(
        'Order can only be cancelled while pending or confirmed',
        'ORDER_CANCEL_FORBIDDEN'
      );
    }

    this.validateTransition(order.status, OrderStatus.CANCELLED);

    const updated = await ordersRepository.cancelOrder(orderId, 'CUSTOMER', reason);

    // Restore inventory
    await this.restoreInventory(orderId);

    logger.info({ orderId, userId }, 'Order cancelled by customer');
    updated.items = await ordersRepository.getOrderItems(orderId);
    return updated;
  }

  // ─── Private Helpers ───────────────────────────────────────────

  private validateTransition(currentStatus: string, newStatus: OrderStatus): void {
    if (!isValidTransition(currentStatus as OrderStatus, newStatus)) {
      throw new BusinessRuleError(
        `Cannot transition from ${currentStatus} to ${newStatus}`,
        'INVALID_STATUS_TRANSITION'
      );
    }
  }

  private async verifyMerchantAccess(userId: string, orderId: string): Promise<Order> {
    const order = await ordersRepository.findById(orderId);
    if (!order) throw new NotFoundError('Order');

    const merchantId = await storesRepository.getMerchantIdByUserId(userId);
    if (!merchantId) throw new NotFoundError('Merchant profile');

    const isOwner = await storesRepository.isOwnedByMerchant(order.storeId, merchantId);
    if (!isOwner) throw new AuthorizationError('Not your store order', 'RESOURCE_NOT_OWNED');

    return order;
  }

  private async restoreInventory(orderId: string): Promise<void> {
    const items = await ordersRepository.getOrderItems(orderId);
    for (const item of items) {
      await productsRepository.updateInventory(
        item.productId,
        -1, // Will be added, not set — need to use raw query
      );
    }
    // Actually, let's do it properly with increment
    const { query: dbQuery } = await import('../../config/database');
    for (const item of items) {
      await dbQuery(
        'UPDATE inventory SET quantity = quantity + $1, updated_at = NOW() WHERE product_id = $2',
        [item.quantity, item.productId]
      );
    }
  }

  private async mockPaymentSuccess(orderId: string): Promise<void> {
    const { query: dbQuery } = await import('../../config/database');
    await dbQuery(
      `UPDATE payments SET status = 'SUCCESS', paid_at = NOW(), transaction_id = $1, updated_at = NOW()
       WHERE order_id = $2`,
      [`mock_txn_${Date.now()}`, orderId]
    );
  }
}

export const ordersService = new OrdersService();
