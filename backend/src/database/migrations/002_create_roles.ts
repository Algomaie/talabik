import { query } from '../../config/database';

export async function up(): Promise<void> {
  await query(`
    CREATE TABLE roles (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name        VARCHAR(50) NOT NULL UNIQUE,
      description VARCHAR(255),
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE permissions (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name        VARCHAR(100) NOT NULL UNIQUE,
      description VARCHAR(255),
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE role_permissions (
      role_id       UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
      permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
      PRIMARY KEY (role_id, permission_id)
    );

    CREATE TABLE user_roles (
      user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role_id     UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
      assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, role_id)
    );

    CREATE INDEX idx_user_roles_user ON user_roles(user_id);
  `);
}

export async function down(): Promise<void> {
  await query(`
    DROP TABLE IF EXISTS user_roles CASCADE;
    DROP TABLE IF EXISTS role_permissions CASCADE;
    DROP TABLE IF EXISTS permissions CASCADE;
    DROP TABLE IF EXISTS roles CASCADE;
  `);
}
