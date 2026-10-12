import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function requireEnv(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const config = {
  env: requireEnv('NODE_ENV', 'development'),
  port: parseInt(requireEnv('PORT', '5000'), 10),
  isProduction: process.env.NODE_ENV === 'production',

  database: {
    url: requireEnv('DATABASE_URL'),
    poolMin: parseInt(requireEnv('DB_POOL_MIN', '2'), 10),
    poolMax: parseInt(requireEnv('DB_POOL_MAX', '10'), 10),
  },

  redis: {
    url: requireEnv('REDIS_URL', 'redis://localhost:6379'),
  },

  jwt: {
    accessSecret: requireEnv('JWT_ACCESS_SECRET'),
    refreshSecret: requireEnv('JWT_REFRESH_SECRET'),
    accessExpiresIn: requireEnv('JWT_ACCESS_EXPIRES_IN', '15m'),
    refreshExpiresIn: requireEnv('JWT_REFRESH_EXPIRES_IN', '7d'),
  },

  cors: {
    origin: requireEnv('CORS_ORIGIN', 'http://localhost:3000'),
  },

  rateLimit: {
    windowMs: parseInt(requireEnv('RATE_LIMIT_WINDOW_MS', '60000'), 10),
    maxRequests: parseInt(requireEnv('RATE_LIMIT_MAX_REQUESTS', '100'), 10),
    loginMax: parseInt(requireEnv('LOGIN_RATE_LIMIT_MAX', '5'), 10),
    loginWindowMs: parseInt(requireEnv('LOGIN_RATE_LIMIT_WINDOW_MS', '60000'), 10),
  },

  logging: {
    level: requireEnv('LOG_LEVEL', 'info'),
  },
} as const;
