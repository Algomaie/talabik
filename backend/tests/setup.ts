// Deliberately override environment before importing application modules.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@127.0.0.1:55432/talbak_test';
process.env.REDIS_URL = 'redis://127.0.0.1:56379';
process.env.JWT_ACCESS_SECRET = 'unit-test-access-secret-not-for-deployment';
process.env.JWT_REFRESH_SECRET = 'unit-test-refresh-secret-not-for-deployment';
process.env.CORS_ORIGIN = 'http://localhost:5173';
process.env.LOG_LEVEL = 'silent';
