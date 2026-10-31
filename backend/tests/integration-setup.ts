const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl || !new URL(databaseUrl).pathname.endsWith('_test')) {
  throw new Error('Set TEST_DATABASE_URL to a dedicated database with a name ending in _test');
}
process.env.DATABASE_URL = databaseUrl;
process.env.NODE_ENV = 'test';
if (process.env.TEST_REDIS_URL) process.env.REDIS_URL = process.env.TEST_REDIS_URL;
process.env.JWT_ACCESS_SECRET = 'integration-access-secret-local-tests-only';
process.env.JWT_REFRESH_SECRET = 'integration-refresh-secret-local-tests-only';
process.env.LOG_LEVEL = 'silent';
