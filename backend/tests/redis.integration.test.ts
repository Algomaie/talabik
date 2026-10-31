import { describe, it, expect, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { cacheService } from '../src/redis/cache.service';
import { connectRedis, closeRedis } from '../src/redis/client';

describe.skipIf(!process.env.TEST_REDIS_URL)('Real Redis session store', () => {
  afterAll(closeRedis);
  it('consumes a refresh session exactly once under concurrent use', async () => {
    await connectRedis();
    const key = `refresh:test:${randomUUID()}`;
    await cacheService.set(key, 'session', 30);
    const results = await Promise.all([cacheService.consume(key), cacheService.consume(key)]);
    expect(results.filter(value => value === 'session')).toHaveLength(1);
    expect(results.filter(value => value === null)).toHaveLength(1);
  });
});
