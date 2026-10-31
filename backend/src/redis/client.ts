import Redis from 'ioredis';
import { config } from '../config';
import { logger } from '../common/utils/logger';

let redis: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redis) {
    redis = new Redis(config.redis.url, {
      maxRetriesPerRequest: 3,
      enableOfflineQueue: false,
      retryStrategy(times) {
        const delay = Math.min(times * 200, 5000);
        logger.warn({ attempt: times, delay }, 'Redis reconnection attempt');
        return delay;
      },
      lazyConnect: true,
    });

    redis.on('connect', () => {
      logger.info('Redis connected');
    });

    redis.on('error', (err) => {
      logger.error({ err }, 'Redis connection error');
    });

    redis.on('close', () => {
      logger.warn('Redis connection closed');
    });
  }

  return redis;
}

export async function connectRedis(): Promise<void> {
  const client = getRedisClient();
  try {
    await client.connect();
    await client.ping();
    logger.info('Redis connection verified');
  } catch (error) {
    logger.error({ error }, 'Redis connection failed');
    if (config.isProduction) throw error;
    // Redis failure is non-fatal — app can work without it (degraded mode)
    logger.warn('Application will continue without Redis (degraded mode)');
  }
}

export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
    logger.info('Redis connection closed');
  }
}
