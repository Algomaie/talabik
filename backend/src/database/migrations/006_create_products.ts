import { query } from '../../config/database';

export async function up(): Promise<void> {
  await query(`
    CREATE TABLE categories (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      store_id    UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
      name        VARCHAR(100) NOT NULL,
      slug        VARCHAR(100) NOT NULL,
      description TEXT,
      sort_order  INTEGER DEFAULT 0,
      is_active   BOOLEAN NOT NULL DEFAULT true,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (store_id, slug)
    );

    CREATE INDEX idx_categories_store ON categories(store_id);

    CREATE TABLE products (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
      category_id     UUID REFERENCES categories(id) ON DELETE SET NULL,
      name            VARCHAR(255) NOT NULL,
      slug            VARCHAR(255) NOT NULL,
      description     TEXT,
      price           DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
      compare_price   DECIMAL(10, 2) CHECK (compare_price >= 0),
      image_url       VARCHAR(500),
      is_active       BOOLEAN NOT NULL DEFAULT true,
      sort_order      INTEGER DEFAULT 0,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (store_id, slug)
    );

    CREATE INDEX idx_products_store ON products(store_id);
    CREATE INDEX idx_products_category ON products(category_id);
    CREATE INDEX idx_products_store_active ON products(store_id, is_active) WHERE is_active = true;

    CREATE TABLE inventory (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      product_id  UUID NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
      quantity    INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
      low_stock   INTEGER NOT NULL DEFAULT 5,
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE UNIQUE INDEX idx_inventory_product ON inventory(product_id);
  `);
}

export async function down(): Promise<void> {
  await query(`
    DROP TABLE IF EXISTS inventory CASCADE;
    DROP TABLE IF EXISTS products CASCADE;
    DROP TABLE IF EXISTS categories CASCADE;
  `);
}
