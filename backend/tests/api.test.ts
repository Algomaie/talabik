import { describe, it, expect, vi, beforeEach } from 'vitest';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import jwt from 'jsonwebtoken';
vi.mock('../src/modules/auth/auth.repository', () => ({ authRepository: {
  findById: vi.fn(),
} }));
vi.mock('../src/redis/cache.service', () => ({ cacheService: {
  increment: vi.fn().mockResolvedValue(1), exists: vi.fn().mockResolvedValue(false),
  get: vi.fn().mockResolvedValue(null), set: vi.fn(), del: vi.fn(), delPattern: vi.fn(),
} }));
import app from '../src/app';
import { config } from '../src/config';
import { authRepository } from '../src/modules/auth/auth.repository';
const claims = () => ({ sub: randomUUID(), jti: randomUUID(), tokenUse: 'access', tokenVersion: 0 });
beforeEach(() => {
  vi.mocked(authRepository.findById).mockResolvedValue({ isActive: true, roles: ['CUSTOMER'], tokenVersion: 0 } as any);
});
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
    const token = jwt.sign(claims(), config.jwt.accessSecret, { expiresIn: '15m' });
    expect((await request(app).get('/api/v1/admin/users').set('Authorization', `Bearer ${token}`)).status).toBe(403);
  });
  it('rejects a suspended account even when its JWT is valid', async () => {
    vi.mocked(authRepository.findById).mockResolvedValue({ isActive: false, tokenVersion: 0 } as any);
    const token = jwt.sign(claims(), config.jwt.accessSecret, { expiresIn: '15m' });
    const response = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(401); expect(response.body.error.code).toBe('ACCOUNT_UNAVAILABLE');
  });
  it('rejects a token issued before the session version changed', async () => {
    vi.mocked(authRepository.findById).mockResolvedValue({ isActive: true, tokenVersion: 1 } as any);
    const token = jwt.sign(claims(), config.jwt.accessSecret, { expiresIn: '15m' });
    const response = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(401); expect(response.body.error.code).toBe('SESSION_REVOKED');
  });
  it('rejects a refresh token as an access token even if signed with the access secret', async () => {
    const token = jwt.sign({ ...claims(), tokenUse: 'refresh' }, config.jwt.accessSecret, { expiresIn: '15m' });
    const response = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(401); expect(response.body.error.code).toBe('TOKEN_INVALID');
  });
  it('rejects signed tokens with missing expiry or malformed user identifiers', async () => {
    for (const payload of [claims(), { ...claims(), sub: 'not-a-uuid', exp: Math.floor(Date.now() / 1000) + 60 }]) {
      const token = jwt.sign(payload, config.jwt.accessSecret);
      const response = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);
      expect(response.status).toBe(401); expect(response.body.error.code).toBe('TOKEN_INVALID');
    }
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
