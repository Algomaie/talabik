import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { testConnection, closePool } from './config/database';
import { connectRedis, closeRedis } from './redis/client';
import { logger } from './common/utils/logger';
import { requestIdMiddleware } from './common/middleware/request-id.middleware';
import { loggerMiddleware } from './common/middleware/logger.middleware';
import { errorHandler } from './common/middleware/error-handler.middleware';
import { rateLimiter } from './common/middleware/rate-limiter.middleware';

// ─── Route Imports ───────────────────────────────────────────────
import authRoutes from './modules/auth/auth.routes';
import usersRoutes from './modules/users/users.routes';
import storesRoutes from './modules/stores/stores.routes';
import productsRoutes from './modules/products/products.routes';
import categoriesRoutes from './modules/categories/categories.routes';
import cartRoutes from './modules/cart/cart.routes';
import ordersRoutes from './modules/orders/orders.routes';
import deliveriesRoutes from './modules/deliveries/deliveries.routes';
import driversRoutes from './modules/drivers/drivers.routes';
import notificationsRoutes from './modules/notifications/notifications.routes';
import ratingsRoutes from './modules/ratings/ratings.routes';
import addressesRoutes from './modules/addresses/addresses.routes';
import adminRoutes from './modules/admin/admin.routes';

const app = express();

// ─── Security Middleware ─────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: config.cors.origin,
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'Idempotency-Key'],
}));

// ─── Body Parsing ────────────────────────────────────────────────
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// ─── Request Tracing ─────────────────────────────────────────────
app.use(requestIdMiddleware);
app.use(loggerMiddleware);

// ─── Global Rate Limiter ─────────────────────────────────────────
app.use(
  '/api',
  rateLimiter({
    keyPrefix: 'ratelimit:api',
    maxRequests: config.rateLimit.maxRequests,
    windowSeconds: Math.floor(config.rateLimit.windowMs / 1000),
    keyExtractor: (req) => req.user?.id || req.ip || 'anonymous',
  })
);

// ─── Health Check ────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ─── API Routes (v1) ─────────────────────────────────────────────
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/stores', storesRoutes);
app.use('/api/v1/products', productsRoutes);
app.use('/api/v1/categories', categoriesRoutes);
app.use('/api/v1/cart', cartRoutes);
app.use('/api/v1/orders', ordersRoutes);
app.use('/api/v1/deliveries', deliveriesRoutes);
app.use('/api/v1/drivers', driversRoutes);
app.use('/api/v1/notifications', notificationsRoutes);
app.use('/api/v1/ratings', ratingsRoutes);
app.use('/api/v1/addresses', addressesRoutes);
app.use('/api/v1/admin', adminRoutes);

// ─── 404 Handler ─────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: 'The requested endpoint does not exist',
    },
  });
});

// ─── Centralized Error Handler ───────────────────────────────────
app.use(errorHandler);

// ─── Server Startup ──────────────────────────────────────────────
async function startServer(): Promise<void> {
  try {
    // Verify database connection
    await testConnection();

    // Connect to Redis (non-fatal if unavailable)
    await connectRedis();

    // Start HTTP server
    const server = app.listen(config.port, () => {
      logger.info({
        port: config.port,
        env: config.env,
        pid: process.pid,
      }, `🚀 Talbak API server running on port ${config.port}`);
    });

    // ─── Graceful Shutdown ─────────────────────────────────────
    const shutdown = async (signal: string) => {
      logger.info({ signal }, 'Shutdown signal received');

      server.close(async () => {
        logger.info('HTTP server closed');
        await closePool();
        await closeRedis();
        logger.info('All connections closed. Exiting.');
        process.exit(0);
      });

      // Force exit after 10s if graceful shutdown fails
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('unhandledRejection', (reason) => {
      logger.error({ reason }, 'Unhandled promise rejection');
    });

    process.on('uncaughtException', (error) => {
      logger.fatal({ error }, 'Uncaught exception — shutting down');
      process.exit(1);
    });
  } catch (error) {
    logger.fatal({ error }, 'Failed to start server');
    process.exit(1);
  }
}

if (require.main === module) startServer();

export default app;
