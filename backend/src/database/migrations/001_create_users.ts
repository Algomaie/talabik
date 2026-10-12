import { query } from '../../config/database';

export async function up(): Promise<void> {
  await query(`
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";

    CREATE TABLE users (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email           VARCHAR(255) NOT NULL,
      password_hash   VARCHAR(255) NOT NULL,
      first_name      VARCHAR(100) NOT NULL,
      last_name       VARCHAR(100) NOT NULL,
      phone           VARCHAR(20),
      avatar_url      VARCHAR(500),
      is_active       BOOLEAN NOT NULL DEFAULT true,
      email_verified  BOOLEAN NOT NULL DEFAULT false,
      last_login_at   TIMESTAMPTZ,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE UNIQUE INDEX idx_users_email ON users(email);
  `);
}

export async function down(): Promise<void> {
  await query('DROP TABLE IF EXISTS users CASCADE');
}
