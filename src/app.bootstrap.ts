import {
  INestApplication,
  ValidationPipe,
  RequestMethod,
} from '@nestjs/common';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
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

export function bootstrapApp(
  app: INestApplication,
  options: BootstrapOptions = {},
) {
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
  const corsOrigins = corsDisabled
    ? true
    : (options.corsOrigins ?? parseCorsOrigins(process.env.CORS_ORIGIN));
  app.enableCors({
    origin: buildCorsOriginOption(corsOrigins),
    credentials: true,
  });

  const rateLimitEnabled = options.rateLimit?.enabled ?? true;
  if (rateLimitEnabled) {
    const windowMs =
      options.rateLimit?.windowMs ??
      Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000);
    const max =
      options.rateLimit?.max ?? Number(process.env.RATE_LIMIT_MAX ?? 200);
    const authMax =
      options.rateLimit?.authMax ??
      Number(process.env.RATE_LIMIT_AUTH_MAX ?? 20);
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
    });
    const authLimiter = rateLimit({
      windowMs,
      max: authMax,
      standardHeaders: true,
      legacyHeaders: false,
    });
    const authLoginLimiter = rateLimit({
      windowMs,
      max: authLoginMax,
      standardHeaders: true,
      legacyHeaders: false,
    });
    const geoLimiter = rateLimit({
      windowMs,
      max: geoMax,
      standardHeaders: true,
      legacyHeaders: false,
    });
    const offersLimiter = rateLimit({
      windowMs,
      max: offersMax,
      standardHeaders: true,
      legacyHeaders: false,
    });
    const paymentsLimiter = rateLimit({
      windowMs,
      max: paymentsMax,
      standardHeaders: true,
      legacyHeaders: false,
    });

    app.use(globalLimiter);

    const base = prefix ? `/${prefix}` : '';
    app.use(`${base}/auth/login`, authLoginLimiter);
    app.use(`${base}/auth/refresh`, authLoginLimiter);
    app.use(`${base}/auth/web/login`, authLoginLimiter);
    app.use(`${base}/auth/web/refresh`, authLoginLimiter);
    app.use(`${base}/auth`, authLimiter);
    app.use(`${base}/admin`, authLimiter);
    app.use(`${base}/v1/admin`, authLimiter);
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
