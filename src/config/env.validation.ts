import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().integer().min(1).max(65535).default(3000),
  API_PREFIX: Joi.string().default('api'),

  DATABASE_URL: Joi.string().uri().required(),
  SHADOW_DATABASE_URL: Joi.string().uri().optional(),

  REDIS_URL: Joi.string().uri().required(),

  JWT_ACCESS_SECRET: Joi.string().min(16).required(),
  JWT_ACCESS_TTL: Joi.number().integer().min(1).default(900),
  JWT_REFRESH_SECRET: Joi.string().min(16).required(),
  JWT_REFRESH_TTL: Joi.number().integer().min(1).default(2_592_000),

  CORS_ORIGIN: Joi.string().allow('').default(''),
  CORS_DISABLED: Joi.boolean().default(false),
  CORS_STRICT_LOCAL: Joi.boolean().default(false),

  RATE_LIMIT_WINDOW_MS: Joi.number().integer().min(1000).default(60_000),
  RATE_LIMIT_MAX: Joi.number().integer().min(1).default(200),
  RATE_LIMIT_AUTH_MAX: Joi.number().integer().min(1).default(20),
  RATE_LIMIT_AUTH_LOGIN_MAX: Joi.number().integer().min(1).default(10),
  LOGIN_LOCK_MAX_ATTEMPTS: Joi.number().integer().min(1).default(5),
  LOGIN_LOCK_WINDOW_SEC: Joi.number().integer().min(30).default(600),

  LOG_LEVEL: Joi.string()
    .valid('fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent')
    .default('info'),

  SWAGGER_ENABLED: Joi.boolean().default(false),
  REALTIME_ENABLED: Joi.boolean().default(false),
  METRICS_ENABLED: Joi.boolean().default(true),
  GEO_MAX_UPDATES_PER_SEC: Joi.number().integer().min(1).max(100).default(5),
  GEO_RETENTION_ENABLED: Joi.boolean().default(true),
  GEO_RETENTION_CRON: Joi.string().default('0 3 * * *'),
  GEO_LOCATION_RETENTION_DAYS: Joi.number()
    .integer()
    .min(1)
    .max(365)
    .default(30),
  GEO_RETENTION_LOCK_SEC: Joi.number().integer().min(10).default(300),

  BOOKING_CANCEL_FEE_PERCENT: Joi.number().min(0).max(100).default(10),

  OFFERS_MAX_DRIVER: Joi.number().integer().min(1).default(3),
  OFFERS_MAX_PASSENGER: Joi.number().integer().min(1).default(3),

  SENTRY_ENABLED: Joi.boolean().default(true),
  SENTRY_DSN: Joi.string().uri().allow('').optional(),
  SENTRY_ENV: Joi.string().optional(),
  SENTRY_RELEASE: Joi.string().optional(),
  SENTRY_TRACES_SAMPLE_RATE: Joi.number().min(0).max(1).default(0),

  ROUTING_PROVIDER: Joi.string().valid('osrm', 'mock').optional(),
  OSRM_BASE_URL: Joi.string().uri().allow('').optional(),

  AUTH_COOKIE_SECURE: Joi.boolean().default(false),
  AUTH_COOKIE_DOMAIN: Joi.string().allow('').optional(),
  SUPERADMIN_PHONE: Joi.string().allow('').optional(),
  SUPERADMIN_PASSWORD: Joi.string().allow('').optional(),
  SUPERADMIN_IMMUTABLE: Joi.boolean().default(true),
  BOOTSTRAP_SUPERADMIN_PHONE: Joi.string().allow('').optional(),
  BOOTSTRAP_SUPERADMIN_PASSWORD: Joi.string().allow('').optional(),

  PAYMENT_PROVIDER: Joi.string().valid('click', 'payme', 'stripe').optional(),
  PAYMENT_WEBHOOK_SECRET: Joi.string().allow('').optional(),
  CLICK_WEBHOOK_SECRET: Joi.string().allow('').optional(),
  PAYME_WEBHOOK_SECRET: Joi.string().allow('').optional(),
  STRIPE_WEBHOOK_SECRET: Joi.string().allow('').optional(),
  PAYMENT_RECONCILE_ENABLED: Joi.boolean().default(true),
  PAYMENT_RECONCILE_CRON: Joi.string().default('*/10 * * * *'),
  PAYMENT_RECONCILE_STALE_MINUTES: Joi.number().integer().min(1).default(60),
  PAYMENT_RECONCILE_BATCH: Joi.number().integer().min(1).max(1000).default(200),
  PAYMENT_RECONCILE_LOCK_SEC: Joi.number().integer().min(10).default(120),

  STORAGE_PROVIDER: Joi.string()
    .valid('s3', 'r2', 'minio', 'none')
    .default('none'),
  STORAGE_BUCKET: Joi.string().allow('').optional(),
  STORAGE_ACCESS_KEY: Joi.string().allow('').optional(),
  STORAGE_SECRET_KEY: Joi.string().allow('').optional(),
  STORAGE_ENDPOINT: Joi.string().allow('').optional(),
  STORAGE_PUBLIC_BASE_URL: Joi.string().allow('').optional(),
  STORAGE_SIGNED_URL_TTL_SEC: Joi.number().integer().min(60).default(900),

  MIGRATION_LOCK_KEY: Joi.number().integer().default(87234123),
  MIGRATION_LOCK_TIMEOUT_SEC: Joi.number().integer().min(1).default(60),

  TELEGRAM_ENABLED: Joi.boolean().default(false),
  TELEGRAM_BOT_TOKEN: Joi.string().allow('').optional(),
  TELEGRAM_CHAT_ID: Joi.string().allow('').optional(),
}).unknown(true);
