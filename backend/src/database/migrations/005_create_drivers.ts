import { query } from '../../config/database';

export async function up(): Promise<void> {
  await query(`
    CREATE TABLE drivers (
      id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id             UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      license_number      VARCHAR(50),
      vehicle_type        VARCHAR(50) CHECK (vehicle_type IN ('BICYCLE', 'MOTORCYCLE', 'CAR')),
      vehicle_plate       VARCHAR(20),
      status              VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                          CHECK (status IN ('PENDING', 'APPROVED', 'SUSPENDED')),
      availability        VARCHAR(20) NOT NULL DEFAULT 'OFFLINE'
                          CHECK (availability IN ('ONLINE', 'OFFLINE', 'BUSY')),
      current_latitude    DECIMAL(10, 8),
      current_longitude   DECIMAL(11, 8),
      avg_rating          DECIMAL(3, 2) DEFAULT 0,
      total_deliveries    INTEGER DEFAULT 0,
      total_earnings      DECIMAL(12, 2) DEFAULT 0,
      created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE UNIQUE INDEX idx_drivers_user ON drivers(user_id);
    CREATE INDEX idx_drivers_availability ON drivers(availability) WHERE availability = 'ONLINE';
  `);
}

export async function down(): Promise<void> {
  await query('DROP TABLE IF EXISTS drivers CASCADE');
}
