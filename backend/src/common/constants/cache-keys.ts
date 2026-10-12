/**
 * Redis key patterns used across the application.
 * Centralizing these prevents typos and makes cache invalidation auditable.
 */
export const CacheKeys = {
  // Store cache
  storesList: (page: number) => `stores:list:page:${page}`,
  store: (id: string) => `store:${id}`,

  // Product cache
  productsByStore: (storeId: string, page: number) => `products:store:${storeId}:page:${page}`,
  product: (id: string) => `product:${id}`,

  // User/notification cache
  notificationCount: (userId: string) => `user:${userId}:notifications:count`,

  // Rate limiting
  rateLimitLogin: (ip: string) => `ratelimit:login:${ip}`,
  rateLimitRegister: (ip: string) => `ratelimit:register:${ip}`,
  rateLimitApi: (userId: string) => `ratelimit:api:${userId}`,

  // Auth tokens
  refreshToken: (userId: string, tokenId: string) => `refresh:${userId}:${tokenId}`,
  accessBlacklist: (tokenId: string) => `blacklist:access:${tokenId}`,

  // Idempotency
  idempotencyKey: (key: string) => `idempotency:${key}`,

  // Temporary data
  otp: (userId: string) => `otp:${userId}`,
  checkoutState: (userId: string) => `checkout:${userId}`,
} as const;

/**
 * Default TTLs in seconds
 */
export const CacheTTL = {
  STORE_LIST: 300,        // 5 minutes
  STORE_DETAIL: 600,      // 10 minutes
  PRODUCT_LIST: 300,      // 5 minutes
  PRODUCT_DETAIL: 600,    // 10 minutes
  NOTIFICATION_COUNT: 60, // 1 minute
  REFRESH_TOKEN: 604800,  // 7 days
  IDEMPOTENCY: 86400,     // 24 hours
  OTP: 300,               // 5 minutes
  CHECKOUT: 1800,         // 30 minutes
} as const;
