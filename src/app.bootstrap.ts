import {
  INestApplication,
  ValidationPipe,
  RequestMethod,
} from '@nestjs/common';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import type { Request } from 'express';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { RequestIdMiddleware } from './common/middlewares/request-id.middleware';
import { AppLoggerService } from './infrastructure/logger/logger.service';
import { setupSwagger } from './common/swagger';

export type BootstrapOptions = {
  prefix?: string | null;
  enableSwagger?: boolean;
  corsOrigins?: string[] | boolean;
  rateLimit?: {
    enabled?: boolean;
    windowMs?: number;
    max?: number;
    authMax?: number;
    adminMax?: number;
  };
  trustProxy?: boolean;
  enableRequestId?: boolean;
  enableLogger?: boolean;
};

function parseCorsOrigins(value: string | undefined): string[] | boolean {
  if (!value) return false;
  const v = value.trim();
  if (!v) return false;
  if (v === '*') return true;
  return v
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

function isLocalhostOrigin(origin: string): boolean {
  try {
    const parsed = new URL(origin);
    return parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

function buildCorsOriginOption(
  corsOrigins: string[] | boolean,
):
  | ((
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => void)
  | boolean {
  if (corsOrigins === true) {
    return true;
  }

  if (corsOrigins === false) {
    // Dev-friendly fallback: allow localhost/127.0.0.1 when CORS_ORIGIN is not set.
    return (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      callback(null, isLocalhostOrigin(origin));
    };
  }

  const allowed = new Set(corsOrigins);
  return (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }
    callback(null, allowed.has(origin));
  };
}

function isPrivateIp(value: string): boolean {
  return (
    value.startsWith('10.') ||
    value.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(value)
  );
}

function getRequestIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim().length > 0) {
    return forwarded.split(',')[0]?.trim() ?? '';
  }
  return req.ip ?? '';
}

function shouldSkipRateLimitForLocal(req: Request): boolean {
  const host = String(req.headers.host ?? '').toLowerCase();
  if (host.includes('localhost') || host.includes('127.0.0.1')) {
    return true;
  }

  const origin = String(req.headers.origin ?? '').toLowerCase();
  if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
    return true;
  }

  const referer = String(req.headers.referer ?? '').toLowerCase();
  if (referer.includes('localhost') || referer.includes('127.0.0.1')) {
    return true;
  }

  const ip = getRequestIp(req).replace('::ffff:', '');
  if (ip === '127.0.0.1' || ip === '::1') return true;
  if (isPrivateIp(ip)) return true;

  return false;
}

export function bootstrapApp(
  app: INestApplication,
  options: BootstrapOptions = {},
) {
  const isProduction =
    String(process.env.NODE_ENV ?? 'development') === 'production';
  const prefix = options.prefix ?? process.env.API_PREFIX ?? 'api';

  if (options.trustProxy ?? true) {
    const httpAdapter = app.getHttpAdapter();
    const instance = httpAdapter.getInstance() as {
      set?: (key: string, value: unknown) => void;
    };

    if (typeof instance.set === 'function') {
      instance.set('trust proxy', 1);
    }
  }

  if (prefix) {
    app.setGlobalPrefix(prefix, {
      exclude: [
        { path: 'health/*path', method: RequestMethod.ALL },
        { path: 'metrics', method: RequestMethod.ALL },
      ],
    });
  }

  const swaggerEnabled =
    options.enableSwagger ??
    String(process.env.SWAGGER_ENABLED ?? 'false') === 'true';
  if (swaggerEnabled) {
    setupSwagger(app);
  }

  app.use(helmet());

  const corsDisabled = String(process.env.CORS_DISABLED ?? 'false') === 'true';
  const strictLocalCors =
    String(process.env.CORS_STRICT_LOCAL ?? 'false') === 'true';
  const allowAllOriginsInLocal = !isProduction && !strictLocalCors;
  const corsOrigins = corsDisabled
    ? true
    : (options.corsOrigins ?? parseCorsOrigins(process.env.CORS_ORIGIN));
  app.enableCors({
    origin: allowAllOriginsInLocal ? true : buildCorsOriginOption(corsOrigins),
    credentials: true,
  });

  const rateLimitEnabled = options.rateLimit?.enabled ?? true;
  const disableLocalRateLimit =
    !isProduction ||
    String(process.env.RATE_LIMIT_DISABLE_LOCAL ?? 'false') === 'true';
  if (rateLimitEnabled && !disableLocalRateLimit) {
    const windowMs =
      options.rateLimit?.windowMs ??
      Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000);
    const max =
      options.rateLimit?.max ?? Number(process.env.RATE_LIMIT_MAX ?? 200);
    const authMax =
      options.rateLimit?.authMax ??
      Number(process.env.RATE_LIMIT_AUTH_MAX ?? 20);
    const adminMaxRaw =
      options.rateLimit?.adminMax ??
      Number(process.env.RATE_LIMIT_ADMIN_MAX ?? 300);
    const adminMax = isProduction ? adminMaxRaw : Math.max(adminMaxRaw, 500);
    const authLoginMax = Number(
      process.env.RATE_LIMIT_AUTH_LOGIN_MAX ??
        Math.max(5, Math.floor(authMax / 2)),
    );
    const geoMax = Number(process.env.RATE_LIMIT_GEO_MAX ?? 60);
    const offersMax = Number(process.env.RATE_LIMIT_OFFERS_MAX ?? 40);
    const paymentsMax = Number(process.env.RATE_LIMIT_PAYMENTS_MAX ?? 30);

    const globalLimiter = rateLimit({
      windowMs,
      max,
      standardHeaders: true,
      legacyHeaders: false,
      skip: shouldSkipRateLimitForLocal,
    });
    const authLimiter = rateLimit({
      windowMs,
      max: authMax,
      standardHeaders: true,
      legacyHeaders: false,
      skip: shouldSkipRateLimitForLocal,
    });
    const adminLimiter = rateLimit({
      windowMs,
      max: adminMax,
      standardHeaders: true,
      legacyHeaders: false,
      skip: shouldSkipRateLimitForLocal,
    });
    const authLoginLimiter = rateLimit({
      windowMs,
      max: authLoginMax,
      standardHeaders: true,
      legacyHeaders: false,
      skip: shouldSkipRateLimitForLocal,
    });
    const geoLimiter = rateLimit({
      windowMs,
      max: geoMax,
      standardHeaders: true,
      legacyHeaders: false,
      skip: shouldSkipRateLimitForLocal,
    });
    const offersLimiter = rateLimit({
      windowMs,
      max: offersMax,
      standardHeaders: true,
      legacyHeaders: false,
      skip: shouldSkipRateLimitForLocal,
    });
    const paymentsLimiter = rateLimit({
      windowMs,
      max: paymentsMax,
      standardHeaders: true,
      legacyHeaders: false,
      skip: shouldSkipRateLimitForLocal,
    });

    app.use(globalLimiter);

    const base = prefix ? `/${prefix}` : '';
    app.use(`${base}/auth/login`, authLoginLimiter);
    app.use(`${base}/auth/refresh`, authLoginLimiter);
    app.use(`${base}/auth/web/login`, authLoginLimiter);
    app.use(`${base}/auth/web/refresh`, authLoginLimiter);
    app.use(`${base}/auth`, authLimiter);
    app.use(`${base}/admin`, adminLimiter);
    app.use(`${base}/v1/admin`, adminLimiter);
    app.use(`${base}/geo`, geoLimiter);
    app.use(`${base}/requests`, offersLimiter);
    app.use(`${base}/payments`, paymentsLimiter);
  }

  if (options.enableRequestId ?? true) {
    const requestIdMiddleware = new RequestIdMiddleware();
    app.use(requestIdMiddleware.use.bind(requestIdMiddleware));
  }

  if (options.enableLogger ?? true) {
    const logger = app.get(AppLoggerService);
    app.useLogger(logger);
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());
}
