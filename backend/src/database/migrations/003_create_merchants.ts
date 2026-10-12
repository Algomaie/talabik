import { query } from '../../config/database';

export async function up(): Promise<void> {
  await query(`
    CREATE TABLE merchants (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id         UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      business_name   VARCHAR(255) NOT NULL,
      business_email  VARCHAR(255),
      business_phone  VARCHAR(20),
      tax_id          VARCHAR(50),
      status          VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                      CHECK (status IN ('PENDING', 'APPROVED', 'SUSPENDED', 'REJECTED')),
      approved_at     TIMESTAMPTZ,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE UNIQUE INDEX idx_merchants_user ON merchants(user_id);
  `);
}

export async function down(): Promise<void> {
  await query('DROP TABLE IF EXISTS merchants CASCADE');
}
