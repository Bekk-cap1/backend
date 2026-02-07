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

  RATE_LIMIT_WINDOW_MS: Joi.number().integer().min(1000).default(60_000),
  RATE_LIMIT_MAX: Joi.number().integer().min(1).default(200),
  RATE_LIMIT_AUTH_MAX: Joi.number().integer().min(1).default(20),

  LOG_LEVEL: Joi.string()
    .valid('fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent')
    .default('info'),

  SWAGGER_ENABLED: Joi.boolean().default(false),
  REALTIME_ENABLED: Joi.boolean().default(false),
  METRICS_ENABLED: Joi.boolean().default(true),

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

  TELEGRAM_ENABLED: Joi.boolean().default(false),
  TELEGRAM_BOT_TOKEN: Joi.string().allow('').optional(),
  TELEGRAM_CHAT_ID: Joi.string().allow('').optional(),
}).unknown(true);
