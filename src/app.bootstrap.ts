import { INestApplication, ValidationPipe } from '@nestjs/common';
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
  return v
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
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
    app.setGlobalPrefix(prefix);
  }

  const swaggerEnabled =
    options.enableSwagger ??
    String(process.env.SWAGGER_ENABLED ?? 'false') === 'true';
  if (swaggerEnabled) {
    setupSwagger(app);
  }

  app.use(helmet());

  const corsOrigins =
    options.corsOrigins ?? parseCorsOrigins(process.env.CORS_ORIGIN);
  app.enableCors({
    origin: corsOrigins === false ? false : corsOrigins,
    credentials: true,
  });

  const rateLimitEnabled = options.rateLimit?.enabled ?? true;
  if (rateLimitEnabled) {
    const windowMs =
      options.rateLimit?.windowMs ??
      Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000);
    const max =
      options.rateLimit?.max ??
      Number(process.env.RATE_LIMIT_MAX ?? 200);
    const authMax =
      options.rateLimit?.authMax ??
      Number(process.env.RATE_LIMIT_AUTH_MAX ?? 20);

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

    app.use(globalLimiter);

    const base = prefix ? `/${prefix}` : '';
    app.use(`${base}/auth`, authLimiter);
    app.use(`${base}/admin`, authLimiter);
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
