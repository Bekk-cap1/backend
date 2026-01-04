import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().integer().min(1).max(65535).default(3000),
  API_PREFIX: Joi.string().default('api'),

  DATABASE_URL: Joi.string().uri().required(),
  SHADOW_DATABASE_URL: Joi.string().uri().optional(),

  REDIS_URL: Joi.string().uri().required(),

  JWT_ACCESS_SECRET: Joi.string().min(16).required(),
  JWT_ACCESS_TTL: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: Joi.string().min(16).required(),
  JWT_REFRESH_TTL: Joi.string().default('30d'),

  CORS_ORIGIN: Joi.string().allow('').default(''),

  RATE_LIMIT_WINDOW_MS: Joi.number().integer().min(1000).default(60_000),
  RATE_LIMIT_MAX: Joi.number().integer().min(1).default(200),
  RATE_LIMIT_AUTH_MAX: Joi.number().integer().min(1).default(20),

  LOG_LEVEL: Joi.string().valid('fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent').default('info'),

  SWAGGER_ENABLED: Joi.boolean().default(false),
  REALTIME_ENABLED: Joi.boolean().default(false),
}).unknown(true);
