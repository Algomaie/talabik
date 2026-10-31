import { query } from '../../config/database';

export async function up(): Promise<void> {
  await query(`CREATE SEQUENCE IF NOT EXISTS order_number_seq;
    SELECT setval('order_number_seq', GREATEST(
      (SELECT last_value FROM order_number_seq),
      COALESCE((SELECT MAX(substring(order_number from '[0-9]+$')::bigint) FROM orders), 0) + 1
    ), false);
    ALTER TABLE orders ALTER COLUMN order_number TYPE VARCHAR(40);`);
}

export async function down(): Promise<void> {
  // Preserve the sequence and existing order numbers; rollback is intentionally non-destructive.
}
