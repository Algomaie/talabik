import { query } from '../../config/database';

export async function up(): Promise<void> {
  await query(`
    CREATE TABLE addresses (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      label         VARCHAR(50) NOT NULL DEFAULT 'Home',
      address_line  VARCHAR(500) NOT NULL,
      city          VARCHAR(100),
      area          VARCHAR(100),
      latitude      DECIMAL(10, 8),
      longitude     DECIMAL(11, 8),
      is_default    BOOLEAN NOT NULL DEFAULT false,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX idx_addresses_user ON addresses(user_id);

    CREATE TABLE carts (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id     UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      store_id    UUID REFERENCES stores(id) ON DELETE SET NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE UNIQUE INDEX idx_carts_user ON carts(user_id);

    CREATE TABLE cart_items (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      cart_id     UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
      product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      quantity    INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (cart_id, product_id)
    );

    CREATE INDEX idx_cart_items_cart ON cart_items(cart_id);
  `);
}

export async function down(): Promise<void> {
  await query(`
    DROP TABLE IF EXISTS cart_items CASCADE;
    DROP TABLE IF EXISTS carts CASCADE;
    DROP TABLE IF EXISTS addresses CASCADE;
  `);
}
