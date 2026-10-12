import { query } from '../../config/database';

export async function up(): Promise<void> {
  await query(`
    CREATE TABLE notifications (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type        VARCHAR(50) NOT NULL,
      title       VARCHAR(255) NOT NULL,
      message     TEXT NOT NULL,
      data        JSONB,
      is_read     BOOLEAN NOT NULL DEFAULT false,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX idx_notifications_user ON notifications(user_id);
    CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;

    CREATE TABLE ratings (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id    UUID NOT NULL REFERENCES orders(id),
      user_id     UUID NOT NULL REFERENCES users(id),
      target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('STORE', 'DRIVER', 'ORDER')),
      target_id   UUID NOT NULL,
      score       INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),
      comment     TEXT,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (order_id, user_id, target_type)
    );

    CREATE INDEX idx_ratings_target ON ratings(target_type, target_id);

    CREATE TABLE audit_logs (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id     UUID REFERENCES users(id),
      action      VARCHAR(100) NOT NULL,
      entity_type VARCHAR(50) NOT NULL,
      entity_id   UUID,
      old_data    JSONB,
      new_data    JSONB,
      ip_address  VARCHAR(45),
      user_agent  TEXT,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
    CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
    CREATE INDEX idx_audit_logs_action ON audit_logs(action);
    CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
  `);
}

export async function down(): Promise<void> {
  await query(`
    DROP TABLE IF EXISTS audit_logs CASCADE;
    DROP TABLE IF EXISTS ratings CASCADE;
    DROP TABLE IF EXISTS notifications CASCADE;
  `);
}
