import { afterAll, describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
const sessions = vi.hoisted(() => new Map<string, unknown>());
vi.mock('../src/redis/cache.service', () => ({ cacheService: {
  increment: vi.fn().mockResolvedValue(1),
  get: async (key: string) => sessions.get(key) ?? null,
  set: async (key: string, value: unknown) => { sessions.set(key, value); },
  exists: async (key: string) => sessions.has(key),
  consume: async (key: string) => { const value = sessions.get(key); sessions.delete(key); return value ?? null; },
  del: async (key: string) => { sessions.delete(key); },
  delPattern: async (pattern: string) => { for (const key of sessions.keys()) if (key.startsWith(pattern.replace(/\*$/, ''))) sessions.delete(key); },
} }));
import app from '../src/app';
import { query, closePool } from '../src/config/database';
afterAll(closePool);
const register = (role: string) => request(app).post('/api/v1/auth/register').send({
  email: `security-${randomUUID()}@example.test`, password: 'Example123!',
  firstName: 'Security', lastName: 'Test', role, businessName: 'Approval test', licenseNumber: 'TEST-LICENSE',
});
const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

describe('Security boundaries with real PostgreSQL (session-store test double)', () => {
  it('requires administrator approval before a merchant can create or manage a store', async () => {
    const merchant = await register('MERCHANT');
    expect(merchant.status).toBe(201);
    const auth = bearer(merchant.body.data.accessToken);
    const profile = await query('SELECT id, status FROM merchants WHERE user_id = $1', [merchant.body.data.user.id]);
    expect(profile.rows[0].status).toBe('PENDING');
    const storeBody = { name: `Approval ${randomUUID()}` };
    expect((await request(app).post('/api/v1/stores').set(auth).send(storeBody)).status).toBe(404);
    const admin = await request(app).post('/api/v1/auth/login').send({ email: 'admin@talbak.com', password: 'Demo@1234' });
    expect(admin.status).toBe(200);
    const adminAuth = bearer(admin.body.data.accessToken);
    const approval = await request(app).patch(`/api/v1/admin/merchants/${profile.rows[0].id}/status`).set(adminAuth).send({ status: 'APPROVED' });
    expect(approval.status, approval.body.error?.message).toBe(200);
    const created = await request(app).post('/api/v1/stores').set(auth).send(storeBody);
    expect(created.status).toBe(201);
    expect((await request(app).patch(`/api/v1/admin/merchants/${profile.rows[0].id}/status`).set(adminAuth).send({ status: 'SUSPENDED' })).status).toBe(200);
    expect((await request(app).patch(`/api/v1/stores/${created.body.data.store.id}`).set(auth).send({ name: 'Forbidden edit' })).status).toBe(404);
  });

  it('keeps new drivers pending and blocks delivery access', async () => {
    const driver = await register('DRIVER');
    expect(driver.status).toBe(201);
    const profile = await query('SELECT status FROM drivers WHERE user_id = $1', [driver.body.data.user.id]);
    expect(profile.rows[0].status).toBe('PENDING');
    const auth = bearer(driver.body.data.accessToken);
    expect((await request(app).get('/api/v1/deliveries/available').set(auth)).status).toBe(404);
    expect((await request(app).patch('/api/v1/drivers/availability').set(auth).send({ availability: 'ONLINE' })).status).toBe(404);
  });

  it('revokes old access and refresh sessions on password change and logout', async () => {
    const registered = await register('CUSTOMER');
    expect(registered.status).toBe(201);
    const session = registered.body.data;
    const auth = bearer(session.accessToken);
    expect((await request(app).get('/api/v1/auth/me').set(auth)).status).toBe(200);
    expect((await request(app).patch('/api/v1/users/password').set(auth).send({ currentPassword: 'Example123!', newPassword: 'Changed123!' })).status).toBe(200);
    const revoked = await request(app).get('/api/v1/auth/me').set(auth);
    expect(revoked.status).toBe(401); expect(revoked.body.error.code).toBe('SESSION_REVOKED');
    expect((await request(app).post('/api/v1/auth/refresh').send({ refreshToken: session.refreshToken })).status).toBe(401);
    expect((await request(app).post('/api/v1/auth/login').send({ email: session.user.email, password: 'Example123!' })).status).toBe(401);
    const login = await request(app).post('/api/v1/auth/login').send({ email: session.user.email, password: 'Changed123!' });
    expect(login.status).toBe(200);
    const newAuth = bearer(login.body.data.accessToken);
    expect((await request(app).post('/api/v1/auth/logout').set(newAuth)).status).toBe(200);
    expect((await request(app).get('/api/v1/auth/me').set(newAuth)).status).toBe(401);
    expect((await request(app).post('/api/v1/auth/refresh').send({ refreshToken: login.body.data.refreshToken })).status).toBe(401);
  });

  it('allows only one concurrent delivery acceptance per online driver', async () => {
    const driver = await register('DRIVER');
    expect(driver.status).toBe(201);
    const profile = await query("UPDATE drivers SET status = 'APPROVED', availability = 'ONLINE' WHERE user_id = $1 RETURNING id", [driver.body.data.user.id]);
    const seed = await query("SELECT s.id as store_id, u.id as user_id FROM stores s CROSS JOIN users u WHERE s.slug = 'fresh-bites' AND u.email = 'customer@talbak.com'");
    const deliveries: string[] = [];
    for (let i = 0; i < 2; i++) {
      const order = await query("INSERT INTO orders (order_number, user_id, store_id, status, subtotal, total, delivery_fee) VALUES ($1, $2, $3, 'READY_FOR_PICKUP', 100, 105, 5) RETURNING id", [`SEC-${randomUUID()}`, seed.rows[0].user_id, seed.rows[0].store_id]);
      const delivery = await query("INSERT INTO deliveries (order_id, delivery_fee) VALUES ($1, 5) RETURNING id", [order.rows[0].id]);
      deliveries.push(delivery.rows[0].id);
    }
    const auth = bearer(driver.body.data.accessToken);
    const responses = await Promise.all(deliveries.map(id => request(app).post(`/api/v1/deliveries/${id}/accept`).set(auth)));
    expect(responses.map(r => r.status).sort()).toEqual([200, 409]);
    expect((await query("SELECT COUNT(*)::int AS count FROM deliveries WHERE driver_id = $1 AND status = 'ASSIGNED'", [profile.rows[0].id])).rows[0].count).toBe(1);
    expect((await request(app).patch('/api/v1/drivers/availability').set(auth).send({ availability: 'ONLINE' })).status).toBe(404);
  });
});
