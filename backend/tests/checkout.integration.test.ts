import { afterAll, describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
// This suite exercises real PostgreSQL, Express, Argon2 and JWT. Redis is isolated.
vi.mock('../src/redis/cache.service', () => ({ cacheService: {
  increment: vi.fn().mockResolvedValue(1), exists: vi.fn().mockResolvedValue(false),
  get: vi.fn().mockResolvedValue(null), set: vi.fn(), del: vi.fn(), delPattern: vi.fn(),
} }));
import app from '../src/app';
import { query, closePool } from '../src/config/database';
afterAll(closePool);
describe('Seeded local PostgreSQL checkout', () => {
  it('logs in, adds a cart item, creates/replays an order, and cancels once atomically', async () => {
    const login = await request(app).post('/api/v1/auth/login').send({ email: 'customer@talbak.com', password: 'Demo@1234' });
    expect(login.status).toBe(200);
    expect(login.body.data.user.firstName).toBe('Sara');
    const registered = await request(app).post('/api/v1/auth/register').send({
      email: `checkout-${randomUUID()}@example.test`, password: 'Example123!', firstName: 'Test', lastName: 'Customer', role: 'CUSTOMER',
    });
    expect(registered.status).toBe(201);
    const token = registered.body.data.accessToken;
    const auth = { Authorization: `Bearer ${token}` };
    const products = await request(app).get('/api/v1/products').set(auth);
    expect(products.status).toBe(200);
    const product = products.body.data.find((p: any) => p.quantity > 0 && p.price >= 10);
    expect(product).toBeTruthy();
    const before = await query('SELECT quantity FROM inventory WHERE product_id = $1', [product.id]);
    const address = await request(app).post('/api/v1/addresses').set(auth).send({ addressLine: 'Integration test address', city: 'Riyadh' });
    expect(address.status).toBe(201);
    const addressId = address.body.data.address.id;
    const added = await request(app).post('/api/v1/cart/items').set(auth).send({ productId: product.id, quantity: 1 });
    expect(added.status).toBe(201);
    expect(added.body.data.cart.items).toHaveLength(1);
    const key = randomUUID();
    const submit = () => request(app).post('/api/v1/orders').set(auth).set('Idempotency-Key', key).send({ addressId });
    const [first, replay] = await Promise.all([submit(), submit()]);
    expect(first.status).toBe(201); expect(replay.status).toBe(201);
    expect(first.body.data.order.id).toBe(replay.body.data.order.id);
    const orderId = first.body.data.order.id;
    const changedPayload = await request(app).post('/api/v1/orders').set(auth).set('Idempotency-Key', key).send({ addressId, notes: 'different request' });
    expect(changedPayload.status).toBe(409);
    const reserved = await query('SELECT quantity FROM inventory WHERE product_id = $1', [product.id]);
    expect(reserved.rows[0].quantity).toBe(before.rows[0].quantity - 1);
    const persisted = await query('SELECT count(*)::int AS count FROM orders WHERE idempotency_key = $1', [key]);
    expect(persisted.rows[0].count).toBe(1);
    const cancel = () => request(app).post(`/api/v1/orders/${orderId}/cancel`).set(auth).send({ reason: 'Integration test' });
    const results = await Promise.all([cancel(), cancel()]);
    expect(results.filter(r => r.status === 200)).toHaveLength(1);
    expect(results.filter(r => [409, 422].includes(r.status))).toHaveLength(1);
    const restored = await query('SELECT quantity FROM inventory WHERE product_id = $1', [product.id]);
    expect(restored.rows[0].quantity).toBe(before.rows[0].quantity);
  });

  it('runs merchant preparation and driver delivery, paying driver earnings only once', async () => {
    const customer = await request(app).post('/api/v1/auth/register').send({
      email: `delivery-${randomUUID()}@example.test`, password: 'Example123!', firstName: 'Test', lastName: 'Delivery', role: 'CUSTOMER',
    });
    expect(customer.status).toBe(201);
    const customerAuth = { Authorization: `Bearer ${customer.body.data.accessToken}` };
    const merchant = await request(app).post('/api/v1/auth/login').send({ email: 'merchant@talbak.com', password: 'Demo@1234' });
    const driver = await request(app).post('/api/v1/auth/login').send({ email: 'driver@talbak.com', password: 'Demo@1234' });
    expect(merchant.status).toBe(200); expect(driver.status).toBe(200);
    const merchantAuth = { Authorization: `Bearer ${merchant.body.data.accessToken}` };
    const driverAuth = { Authorization: `Bearer ${driver.body.data.accessToken}` };
    const products = await request(app).get('/api/v1/products');
    const product = products.body.data.find((p: any) => p.quantity > 0 && p.price >= 10);
    const address = await request(app).post('/api/v1/addresses').set(customerAuth).send({ addressLine: 'Delivery integration address' });
    const add = await request(app).post('/api/v1/cart/items').set(customerAuth).send({ productId: product.id, quantity: 1 });
    expect(add.status).toBe(201);
    const created = await request(app).post('/api/v1/orders').set(customerAuth).send({ addressId: address.body.data.address.id, idempotencyKey: randomUUID() });
    expect(created.status).toBe(201);
    const orderId = created.body.data.order.id;
    expect((await request(app).post(`/api/v1/orders/${orderId}/confirm`).set(customerAuth)).status).toBe(403);
    expect((await request(app).post(`/api/v1/orders/${orderId}/confirm`).set(merchantAuth)).status).toBe(200);
    for (const status of ['PREPARING', 'READY_FOR_PICKUP']) {
      expect((await request(app).patch(`/api/v1/orders/${orderId}/status`).set(merchantAuth).send({ status })).status).toBe(200);
    }
    const delivery = await query('SELECT id FROM deliveries WHERE order_id = $1', [orderId]);
    const deliveryId = delivery.rows[0].id;
    const before = await query('SELECT total_deliveries, total_earnings FROM drivers WHERE user_id = $1', [driver.body.data.user.id]);
    expect((await request(app).post(`/api/v1/deliveries/${deliveryId}/accept`).set(driverAuth)).status).toBe(200);
    expect((await request(app).get(`/api/v1/orders/${orderId}`).set(driverAuth)).status).toBe(200);
    expect((await request(app).post(`/api/v1/deliveries/${deliveryId}/pickup`).set(driverAuth)).status).toBe(200);
    expect((await request(app).patch(`/api/v1/deliveries/${deliveryId}/status`).set(driverAuth)).status).toBe(200);
    const complete = () => request(app).post(`/api/v1/deliveries/${deliveryId}/complete`).set(driverAuth);
    const results = await Promise.all([complete(), complete()]);
    expect(results.filter(r => r.status === 200)).toHaveLength(1);
    expect(results.filter(r => [409, 422].includes(r.status))).toHaveLength(1);
    const after = await query('SELECT total_deliveries, total_earnings FROM drivers WHERE user_id = $1', [driver.body.data.user.id]);
    expect(after.rows[0].total_deliveries).toBe(before.rows[0].total_deliveries + 1);
    expect(Number(after.rows[0].total_earnings)).toBe(Number(before.rows[0].total_earnings) + created.body.data.order.deliveryFee);
    expect((await query('SELECT status FROM orders WHERE id = $1', [orderId])).rows[0].status).toBe('DELIVERED');
  });
});
