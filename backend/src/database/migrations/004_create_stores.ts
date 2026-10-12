import { query } from '../../config/database';

export async function up(): Promise<void> {
  await query(`
    CREATE TABLE stores (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      merchant_id     UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
      name            VARCHAR(255) NOT NULL,
      slug            VARCHAR(255) NOT NULL UNIQUE,
      description     TEXT,
      logo_url        VARCHAR(500),
      cover_url       VARCHAR(500),
      phone           VARCHAR(20),
      email           VARCHAR(255),
      address         TEXT,
      latitude        DECIMAL(10, 8),
      longitude       DECIMAL(11, 8),
      is_active       BOOLEAN NOT NULL DEFAULT true,
      opens_at        TIME,
      closes_at       TIME,
      min_order       DECIMAL(10, 2) DEFAULT 0,
      delivery_fee    DECIMAL(10, 2) DEFAULT 0,
      avg_rating      DECIMAL(3, 2) DEFAULT 0,
      total_ratings   INTEGER DEFAULT 0,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX idx_stores_merchant ON stores(merchant_id);
    CREATE INDEX idx_stores_active ON stores(is_active) WHERE is_active = true;
  `);
}

export async function down(): Promise<void> {
  await query('DROP TABLE IF EXISTS stores CASCADE');
}
