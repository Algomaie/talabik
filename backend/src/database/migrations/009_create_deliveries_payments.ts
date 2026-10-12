import { query } from '../../config/database';

export async function up(): Promise<void> {
  await query(`
    CREATE TABLE deliveries (
      id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id            UUID NOT NULL UNIQUE REFERENCES orders(id),
      driver_id           UUID REFERENCES drivers(id),
      status              VARCHAR(30) NOT NULL DEFAULT 'PENDING'
                          CHECK (status IN (
                            'PENDING', 'ASSIGNED', 'PICKED_UP',
                            'IN_TRANSIT', 'DELIVERED', 'FAILED'
                          )),
      pickup_latitude     DECIMAL(10, 8),
      pickup_longitude    DECIMAL(11, 8),
      dropoff_latitude    DECIMAL(10, 8),
      dropoff_longitude   DECIMAL(11, 8),
      current_latitude    DECIMAL(10, 8),
      current_longitude   DECIMAL(11, 8),
      distance_km         DECIMAL(8, 2),
      estimated_time_min  INTEGER,
      delivery_fee        DECIMAL(10, 2) NOT NULL DEFAULT 0,
      assigned_at         TIMESTAMPTZ,
      picked_up_at        TIMESTAMPTZ,
      delivered_at        TIMESTAMPTZ,
      created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE UNIQUE INDEX idx_deliveries_order ON deliveries(order_id);
    CREATE INDEX idx_deliveries_driver ON deliveries(driver_id);
    CREATE INDEX idx_deliveries_status ON deliveries(status);
    CREATE INDEX idx_deliveries_driver_status ON deliveries(driver_id, status);

    CREATE TABLE payments (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id        UUID NOT NULL UNIQUE REFERENCES orders(id),
      amount          DECIMAL(10, 2) NOT NULL,
      method          VARCHAR(30) NOT NULL DEFAULT 'CASH'
                      CHECK (method IN ('CASH', 'CARD', 'WALLET')),
      status          VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                      CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED')),
      transaction_id  VARCHAR(255),
      paid_at         TIMESTAMPTZ,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE UNIQUE INDEX idx_payments_order ON payments(order_id);
  `);
}

export async function down(): Promise<void> {
  await query(`
    DROP TABLE IF EXISTS payments CASCADE;
    DROP TABLE IF EXISTS deliveries CASCADE;
  `);
}
