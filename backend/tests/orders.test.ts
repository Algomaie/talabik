import { beforeEach, describe, it, expect, vi } from 'vitest';
vi.mock('../src/config/database', () => ({ query: vi.fn(), withTransaction: vi.fn() }));
vi.mock('../src/redis/cache.service', () => ({ cacheService: { del: vi.fn(), delPattern: vi.fn() } }));
import { ordersRepository } from '../src/modules/orders/orders.repository';
import { ordersService } from '../src/modules/orders/orders.service';
import { storesRepository } from '../src/modules/stores/stores.repository';
import { query, withTransaction } from '../src/config/database';
beforeEach(() => vi.restoreAllMocks());
describe('Order security and cancellation regressions', () => {
  it('does not disclose another customer order through an idempotency key', async () => {
    vi.spyOn(ordersRepository, 'findByIdempotencyKey').mockResolvedValue({ id: 'order', userId: 'other' } as any);
    await expect(ordersService.createOrder('customer', { addressId: 'address', idempotencyKey: 'key' })).rejects.toMatchObject({ statusCode: 409 });
  });
  it('denies merchant without a merchant profile', async () => {
    vi.spyOn(ordersRepository, 'findById').mockResolvedValue({ id: 'order', storeId: 'store' } as any);
    vi.spyOn(storesRepository, 'getMerchantIdByUserId').mockResolvedValue(null);
    await expect(ordersService.getOrderById('order', 'merchant', ['MERCHANT'])).rejects.toMatchObject({ statusCode: 403 });
  });
  it('rejects a stale state transition', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [], rowCount: 0 });
    await expect(ordersRepository.updateStatus('order', 'CONFIRMED', 'confirmed_at', 'PENDING')).rejects.toMatchObject({ statusCode: 409 });
  });
  it('does not restore inventory when a concurrent cancellation already won', async () => {
    const client = { query: vi.fn().mockResolvedValue({ rows: [] }) };
    vi.mocked(withTransaction).mockImplementation(async fn => fn(client as any));
    await expect(ordersRepository.cancelOrder('order', 'CUSTOMER', 'reason', 'PENDING')).rejects.toMatchObject({ statusCode: 409 });
    expect(client.query).toHaveBeenCalledTimes(1);
  });
});
