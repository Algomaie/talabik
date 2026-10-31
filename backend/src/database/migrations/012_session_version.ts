import { query } from '../../config/database';

export async function up(): Promise<void> {
  await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0 CHECK (token_version >= 0)');
}

export async function down(): Promise<void> {
  // Preserve session revocation state; rollback is intentionally non-destructive.
}
