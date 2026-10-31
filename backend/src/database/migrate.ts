import { query } from '../config/database';
import { logger } from '../common/utils/logger';
import path from 'path';
import fs from 'fs';

/**
 * Simple file-based migration runner.
 * Tracks applied migrations in a `_migrations` table.
 * Migrations are executed in filename order (001_, 002_, etc.).
 */

async function ensureMigrationsTable(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function getAppliedMigrations(): Promise<string[]> {
  const result = await query<{ name: string }>(
    'SELECT name FROM _migrations ORDER BY id'
  );
  return result.rows.map((r) => r.name);
}

async function getMigrationFiles(): Promise<string[]> {
  const migrationsDir = path.resolve(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter((f) => !f.endsWith('.d.ts') && (f.endsWith('.ts') || f.endsWith('.js')))
    .sort();
  return files;
}

interface Migration {
  up: () => Promise<void>;
  down: () => Promise<void>;
}

async function runMigrations(direction: 'up' | 'down' = 'up'): Promise<void> {
  await ensureMigrationsTable();

  const applied = await getAppliedMigrations();
  const files = await getMigrationFiles();

  if (direction === 'up') {
    const normalized = (name: string) => name.replace(/\.(ts|js)$/, '');
    const pending = files.filter((f) => !applied.some(name => normalized(name) === normalized(f)));

    if (pending.length === 0) {
      logger.info('No pending migrations');
      return;
    }

    for (const file of pending) {
      logger.info({ migration: file }, 'Running migration');
      const migrationPath = path.resolve(__dirname, 'migrations', file);
      const migration: Migration = require(migrationPath);

      await migration.up();
      await query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
      logger.info({ migration: file }, 'Migration applied');
    }

    logger.info({ count: pending.length }, 'All migrations applied');
  } else {
    // Rollback the last applied migration
    if (applied.length === 0) {
      logger.info('No migrations to rollback');
      return;
    }

    const lastApplied = applied[applied.length - 1];
    logger.info({ migration: lastApplied }, 'Rolling back migration');

    const currentFile = files.find(file => file.replace(/\.(ts|js)$/, '') === lastApplied.replace(/\.(ts|js)$/, ''));
    if (!currentFile) throw new Error(`Migration file missing for ${lastApplied}`);
    const migrationPath = path.resolve(__dirname, 'migrations', currentFile);
    const migration: Migration = require(migrationPath);

    await migration.down();
    await query('DELETE FROM _migrations WHERE name = $1', [lastApplied]);
    logger.info({ migration: lastApplied }, 'Migration rolled back');
  }
}

// CLI entry point
const direction = process.argv[2] === 'down' ? 'down' : 'up';

if (require.main === module) runMigrations(direction)
  .then(() => {
    logger.info('Migration process complete');
    process.exit(0);
  })
  .catch((err) => {
    logger.error({ err }, 'Migration failed');
    process.exit(1);
  });

export { runMigrations };
