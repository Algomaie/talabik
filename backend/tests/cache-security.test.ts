import { describe, it, expect, vi } from 'vitest';
vi.mock('../src/config', () => ({ config: { isProduction: true } }));
vi.mock('../src/common/utils/logger', () => ({ logger: { warn: vi.fn(), debug: vi.fn() } }));
vi.mock('../src/redis/client', () => ({ getRedisClient: () => ({
  get: vi.fn().mockRejectedValue(new Error('offline')),
  getdel: vi.fn().mockRejectedValue(new Error('offline')),
  exists: vi.fn().mockRejectedValue(new Error('offline')),
  setex: vi.fn().mockRejectedValue(new Error('offline')),
  eval: vi.fn().mockRejectedValue(new Error('offline')),
}) }));
import { cacheService } from '../src/redis/cache.service';
describe('Production Redis outage policy', () => {
  it('allows catalog cache fallback', async () => {
    expect(await cacheService.get('product:example')).toBeNull();
  });
  it.each([
    () => cacheService.consume('refresh:user:token'),
    () => cacheService.exists('blacklist:access:token'),
    () => cacheService.set('refresh:user:token', 'token', 60),
    () => cacheService.increment('ratelimit:login:ip', 60),
  ])('fails closed for security state', async operation => {
    await expect(operation()).rejects.toMatchObject({ statusCode: 503, errorCode: 'SESSION_SERVICE_UNAVAILABLE' });
  });
});
