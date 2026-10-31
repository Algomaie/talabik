import { getRedisClient } from './client';
import { logger } from '../common/utils/logger';
import { config } from '../config';
import { AppError } from '../common/errors';

function requireSessionStore(key: string): void {
  if (config.isProduction && /^(refresh:|blacklist:|ratelimit:)/.test(key)) {
    throw new AppError('Session service unavailable', 503, 'SESSION_SERVICE_UNAVAILABLE');
  }
}

/**
 * Cache-Aside pattern implementation.
 * Gracefully falls back to null on Redis failures — caller proceeds to PostgreSQL.
 */
export class CacheService {
  /** Atomically consume a refresh token. Concurrent refreshes cannot both win. */
  async consume<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.getdel(key);
      return value === null ? null : JSON.parse(value) as T;
    } catch {
      requireSessionStore(key);
      return null;
    }
  }
  private get redis() {
    return getRedisClient();
  }

  /**
   * Get a cached value by key.
   * Returns null on cache miss or Redis failure.
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await this.redis.get(key);
      if (cached) {
        logger.debug({ key }, 'Cache hit');
        return JSON.parse(cached) as T;
      }
      logger.debug({ key }, 'Cache miss');
      return null;
    } catch (error) {
      logger.warn({ key, error }, 'Redis read failed, falling back to DB');
      requireSessionStore(key);
      return null;
    }
  }

  /**
   * Set a value in cache with TTL (in seconds).
   */
  async set(key: string, value: any, ttlSeconds: number): Promise<void> {
    try {
      await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
      logger.debug({ key, ttl: ttlSeconds }, 'Cache set');
    } catch (error) {
      logger.warn({ key, error }, 'Redis write failed');
      requireSessionStore(key);
    }
  }

  /**
   * Delete a cached key (invalidation).
   */
  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
      logger.debug({ key }, 'Cache invalidated');
    } catch (error) {
      logger.warn({ key, error }, 'Redis delete failed');
      requireSessionStore(key);
    }
  }

  /**
   * Delete all keys matching a pattern.
   * Use sparingly — SCAN is O(n).
   */
  async delPattern(pattern: string): Promise<void> {
    try {
      let cursor = '0';
      do {
        const [nextCursor, keys] = await this.redis.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          100
        );
        cursor = nextCursor;
        if (keys.length > 0) {
          await this.redis.del(...keys);
          logger.debug({ pattern, count: keys.length }, 'Cache pattern invalidated');
        }
      } while (cursor !== '0');
    } catch (error) {
      logger.warn({ pattern, error }, 'Redis pattern delete failed');
      requireSessionStore(pattern);
    }
  }

  /**
   * Increment a counter with TTL (for rate limiting).
   * Returns the current count after increment.
   */
  async increment(key: string, ttlSeconds: number): Promise<number> {
    try {
      return Number(await this.redis.eval(
        "local count = redis.call('INCR', KEYS[1]); if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]); end; return count",
        1, key, ttlSeconds
      ));
    } catch (error) {
      logger.warn({ key, error }, 'Redis increment failed');
      requireSessionStore(key);
      return 0; // Fail open — allow the request
    }
  }

  /**
   * Check if a key exists.
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      logger.warn({ key, error }, 'Redis exists check failed');
      requireSessionStore(key);
      return false;
    }
  }
}

export const cacheService = new CacheService();
