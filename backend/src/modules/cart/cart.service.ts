import { query, withTransaction } from '../../config/database';
import { productsRepository } from '../products/products.repository';
import { NotFoundError, BusinessRuleError } from '../../common/errors';
import { logger } from '../../common/utils/logger';

export interface CartItem {
  id: string;
  productId: string;
  productName: string;
  productPrice: number;
  productImage: string | null;
  quantity: number;
  total: number;
}

export interface Cart {
  id: string;
  storeId: string | null;
  storeName: string | null;
  items: CartItem[];
  subtotal: number;
  itemCount: number;
}

export class CartService {
  /**
   * Get or create a cart for the user.
   */
  async getCart(userId: string): Promise<Cart> {
    // Get or create cart
    let cartResult = await query<{ id: string; store_id: string | null }>(
      'SELECT id, store_id FROM carts WHERE user_id = $1',
      [userId]
    );

    if (cartResult.rows.length === 0) {
      cartResult = await query(
        'INSERT INTO carts (user_id) VALUES ($1) RETURNING id, store_id',
        [userId]
      );
    }

    const cart = cartResult.rows[0];

    // Get cart items with product details
    const itemsResult = await query<any>(
      `SELECT ci.id, ci.product_id, ci.quantity,
              p.name as product_name, p.price as product_price, p.image_url as product_image
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.cart_id = $1
       ORDER BY ci.created_at ASC`,
      [cart.id]
    );

    const items: CartItem[] = itemsResult.rows.map((row: any) => ({
      id: row.id,
      productId: row.product_id,
      productName: row.product_name,
      productPrice: parseFloat(row.product_price),
      productImage: row.product_image,
      quantity: row.quantity,
      total: parseFloat(row.product_price) * row.quantity,
    }));

    const subtotal = items.reduce((sum, item) => sum + item.total, 0);

    // Get store name if cart has a store
    let storeName: string | null = null;
    if (cart.store_id) {
      const storeResult = await query<{ name: string }>(
        'SELECT name FROM stores WHERE id = $1',
        [cart.store_id]
      );
      storeName = storeResult.rows[0]?.name ?? null;
    }

    return {
      id: cart.id,
      storeId: cart.store_id,
      storeName,
      items,
      subtotal: Math.round(subtotal * 100) / 100,
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    };
  }

  /**
   * Add an item to the cart.
   * Enforces single-store cart rule.
   */
  async addItem(userId: string, productId: string, quantity: number): Promise<Cart> {
    // Verify product exists and is active
    const product = await productsRepository.findById(productId);
    if (!product || !product.isActive) {
      throw new NotFoundError('Product');
    }

    // Check stock
    if (product.quantity < quantity) {
      throw new BusinessRuleError(
        `Insufficient stock. Available: ${product.quantity}`,
        'INSUFFICIENT_INVENTORY'
      );
    }

    return withTransaction(async (client) => {
      // Get or create cart
      let cartResult = await client.query(
        'SELECT id, store_id FROM carts WHERE user_id = $1',
        [userId]
      );

      if (cartResult.rows.length === 0) {
        cartResult = await client.query(
          'INSERT INTO carts (user_id, store_id) VALUES ($1, $2) RETURNING id, store_id',
          [userId, product.storeId]
        );
      }

      const cart = cartResult.rows[0];

      // Enforce single-store rule
      if (cart.store_id && cart.store_id !== product.storeId) {
        throw new BusinessRuleError(
          'Cart can only contain items from one store. Clear your cart to add items from a different store.',
          'CART_STORE_MISMATCH'
        );
      }

      // Set store_id if cart is empty
      if (!cart.store_id) {
        await client.query(
          'UPDATE carts SET store_id = $1, updated_at = NOW() WHERE id = $2',
          [product.storeId, cart.id]
        );
      }

      // Upsert cart item (add quantity if already exists)
      await client.query(
        `INSERT INTO cart_items (cart_id, product_id, quantity)
         VALUES ($1, $2, $3)
         ON CONFLICT (cart_id, product_id)
         DO UPDATE SET quantity = cart_items.quantity + $3, updated_at = NOW()`,
        [cart.id, productId, quantity]
      );

      logger.info({ userId, productId, quantity }, 'Item added to cart');
      return this.getCart(userId);
    });
  }

  /**
   * Update cart item quantity.
   */
  async updateItem(userId: string, itemId: string, quantity: number): Promise<Cart> {
    // Verify item belongs to user's cart
    const result = await query<{ product_id: string }>(
      `SELECT ci.product_id FROM cart_items ci
       JOIN carts c ON ci.cart_id = c.id
       WHERE ci.id = $1 AND c.user_id = $2`,
      [itemId, userId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Cart item');
    }

    // Check stock
    const product = await productsRepository.findById(result.rows[0].product_id);
    if (product && product.quantity < quantity) {
      throw new BusinessRuleError(
        `Insufficient stock. Available: ${product.quantity}`,
        'INSUFFICIENT_INVENTORY'
      );
    }

    await query(
      'UPDATE cart_items SET quantity = $1, updated_at = NOW() WHERE id = $2',
      [quantity, itemId]
    );

    logger.info({ userId, itemId, quantity }, 'Cart item updated');
    return this.getCart(userId);
  }

  /**
   * Remove an item from the cart.
   */
  async removeItem(userId: string, itemId: string): Promise<Cart> {
    const result = await query(
      `DELETE FROM cart_items ci
       USING carts c
       WHERE ci.cart_id = c.id AND ci.id = $1 AND c.user_id = $2
       RETURNING ci.id`,
      [itemId, userId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Cart item');
    }

    // Check if cart is now empty → clear store_id
    const cart = await this.getCart(userId);
    if (cart.items.length === 0) {
      await query(
        'UPDATE carts SET store_id = NULL, updated_at = NOW() WHERE user_id = $1',
        [userId]
      );
      cart.storeId = null;
      cart.storeName = null;
    }

    logger.info({ userId, itemId }, 'Cart item removed');
    return cart;
  }

  /**
   * Clear all items from the cart.
   */
  async clearCart(userId: string): Promise<Cart> {
    await query(
      `DELETE FROM cart_items WHERE cart_id = (SELECT id FROM carts WHERE user_id = $1)`,
      [userId]
    );

    await query(
      'UPDATE carts SET store_id = NULL, updated_at = NOW() WHERE user_id = $1',
      [userId]
    );

    logger.info({ userId }, 'Cart cleared');
    return this.getCart(userId);
  }
}

export const cartService = new CartService();
