import { query } from '../../config/database';

export async function up(): Promise<void> {
  await query(`
    CREATE TABLE orders (
      id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_number        VARCHAR(20) NOT NULL UNIQUE,
      user_id             UUID NOT NULL REFERENCES users(id),
      store_id            UUID NOT NULL REFERENCES stores(id),
      address_id          UUID REFERENCES addresses(id),
      status              VARCHAR(30) NOT NULL DEFAULT 'PENDING'
                          CHECK (status IN (
                            'PENDING', 'CONFIRMED', 'PREPARING',
                            'READY_FOR_PICKUP', 'ASSIGNED', 'PICKED_UP',
                            'OUT_FOR_DELIVERY', 'DELIVERED',
                            'CANCELLED', 'REJECTED', 'FAILED'
                          )),
      subtotal            DECIMAL(10, 2) NOT NULL,
      delivery_fee        DECIMAL(10, 2) NOT NULL DEFAULT 0,
      tax                 DECIMAL(10, 2) NOT NULL DEFAULT 0,
      total               DECIMAL(10, 2) NOT NULL,
      notes               TEXT,
      cancelled_by        VARCHAR(20) CHECK (cancelled_by IN ('CUSTOMER', 'MERCHANT', 'ADMIN', 'SYSTEM')),
      cancel_reason       TEXT,
      idempotency_key     VARCHAR(255) UNIQUE,
      confirmed_at        TIMESTAMPTZ,
      preparing_at        TIMESTAMPTZ,
      ready_at            TIMESTAMPTZ,
      picked_up_at        TIMESTAMPTZ,
      delivered_at        TIMESTAMPTZ,
      cancelled_at        TIMESTAMPTZ,
      created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX idx_orders_user ON orders(user_id);
    CREATE INDEX idx_orders_store ON orders(store_id);
    CREATE INDEX idx_orders_status ON orders(status);
    CREATE INDEX idx_orders_created ON orders(created_at DESC);
    CREATE INDEX idx_orders_user_status ON orders(user_id, status);

    CREATE TABLE order_items (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id      UUID NOT NULL REFERENCES products(id),
      product_name    VARCHAR(255) NOT NULL,
      product_price   DECIMAL(10, 2) NOT NULL,
      quantity        INTEGER NOT NULL CHECK (quantity > 0),
      total           DECIMAL(10, 2) NOT NULL,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX idx_order_items_order ON order_items(order_id);
  `);
}

export async function down(): Promise<void> {
  await query(`
    DROP TABLE IF EXISTS order_items CASCADE;
    DROP TABLE IF EXISTS orders CASCADE;
  `);
}
