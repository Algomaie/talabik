import { getRedisClient } from './client';
import { logger } from '../common/utils/logger';

/**
 * Cache-Aside pattern implementation.
 * Gracefully falls back to null on Redis failures — caller proceeds to PostgreSQL.
 */
export class CacheService {
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
    }
  }

  /**
   * Increment a counter with TTL (for rate limiting).
   * Returns the current count after increment.
   */
  async increment(key: string, ttlSeconds: number): Promise<number> {
    try {
      const multi = this.redis.multi();
      multi.incr(key);
      multi.expire(key, ttlSeconds);
      const results = await multi.exec();
      const count = results?.[0]?.[1] as number;
      return count ?? 0;
    } catch (error) {
      logger.warn({ key, error }, 'Redis increment failed');
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
      return false;
    }
  }
}

export const cacheService = new CacheService();
