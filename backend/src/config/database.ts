import { Pool, PoolConfig } from 'pg';
import { config } from './index';
import { logger } from '../common/utils/logger';

const poolConfig: PoolConfig = {
  connectionString: config.database.url,
  min: config.database.poolMin,
  max: config.database.poolMax,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
};

export const pool = new Pool(poolConfig);

pool.on('connect', () => {
  logger.debug('New database connection established');
});

pool.on('error', (err) => {
  logger.error({ err }, 'Unexpected database pool error');
});

/**
 * Execute a query with parameterized values.
 * All database access MUST use parameterized queries to prevent SQL injection.
 */
export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<{ rows: T[]; rowCount: number | null }> {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;

  logger.debug({ query: text, duration, rowCount: result.rowCount }, 'Executed query');

  return { rows: result.rows as T[], rowCount: result.rowCount };
}

/**
 * Get a client from the pool for transaction support.
 * Always release the client in a finally block.
 */
export async function getClient() {
  const client = await pool.connect();
  return client;
}

/**
 * Execute a set of queries within a database transaction.
 * Automatically commits on success, rolls back on error.
 */
export async function withTransaction<T>(
  fn: (client: import('pg').PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function testConnection(): Promise<void> {
  try {
    const result = await pool.query('SELECT NOW()');
    logger.info({ serverTime: result.rows[0].now }, 'Database connection verified');
  } catch (error) {
    logger.error({ error }, 'Database connection failed');
    throw error;
  }
}

export async function closePool(): Promise<void> {
  await pool.end();
  logger.info('Database pool closed');
}
