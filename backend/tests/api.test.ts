import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
vi.mock('../src/modules/auth/auth.repository', () => ({ authRepository: {
  findById: vi.fn().mockResolvedValue({ isActive: true, roles: ['CUSTOMER'] }),
} }));
vi.mock('../src/redis/cache.service', () => ({ cacheService: {
  increment: vi.fn().mockResolvedValue(1), exists: vi.fn().mockResolvedValue(false),
  get: vi.fn().mockResolvedValue(null), set: vi.fn(), del: vi.fn(), delPattern: vi.fn(),
} }));
import app from '../src/app';
import { config } from '../src/config';
describe('Express API (Redis mocked; no database required)', () => {
  it('serves health without booting listeners on import', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200); expect(response.body.status).toBe('ok');
  });
  it('rejects invalid login input before database access', async () => {
    const response = await request(app).post('/api/v1/auth/login').send({ email: 'invalid', password: '' });
    expect(response.status).toBe(400); expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
  it('rejects unauthenticated order access', async () => {
    const response = await request(app).get('/api/v1/orders');
    expect(response.status).toBe(401); expect(response.body.error.code).toBe('TOKEN_MISSING');
  });
  it('rejects customer access to administration', async () => {
    const token = jwt.sign({ sub: 'user', roles: ['CUSTOMER'], jti: 'token' }, config.jwt.accessSecret);
    expect((await request(app).get('/api/v1/admin/users').set('Authorization', `Bearer ${token}`)).status).toBe(403);
  });
  it('returns 400 for malformed JSON rather than 500', async () => {
    const response = await request(app).post('/api/v1/auth/login').set('Content-Type', 'application/json').send('{');
    expect(response.status).toBe(400); expect(response.body.error.code).toBe('INVALID_JSON');
  });
  it('supports the frontend origin and idempotency header in CORS preflight', async () => {
    const response = await request(app).options('/api/v1/orders').set('Origin', 'http://localhost:5173').set('Access-Control-Request-Method', 'POST');
    expect(response.status).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(response.headers['access-control-allow-headers']).toContain('Idempotency-Key');
  });
});
