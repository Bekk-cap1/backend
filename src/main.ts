import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { RequestIdMiddleware } from './common/middlewares/request-id.middleware';
import { AppLoggerService } from './infrastructure/logger/logger.service';
import { setupSwagger } from './common/swagger';


function parseCorsOrigins(value: string | undefined): string[] | boolean {
  if (!value) return false;
  const v = value.trim();
  if (!v) return false;
  return v.split(',').map((x) => x.trim()).filter(Boolean);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // trust proxy (полезно в проде за nginx)
  const httpAdapter = app.getHttpAdapter();
  const instance = httpAdapter.getInstance();

  if (typeof instance.set === 'function') {
    instance.set('trust proxy', 1);
  }

  // Prefix
  const prefix = process.env.API_PREFIX ?? 'api';
  if (prefix) app.setGlobalPrefix(prefix);

  const swaggerEnabled = String(process.env.SWAGGER_ENABLED ?? 'false') === 'true';
  if (swaggerEnabled) {
    setupSwagger(app);
  }

  
  // Security
  app.use(helmet());

  const corsOrigins = parseCorsOrigins(process.env.CORS_ORIGIN);
  app.enableCors({
    origin: corsOrigins === false ? false : corsOrigins,
    credentials: true,
  });

  // Rate limit
  const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000);
  const max = Number(process.env.RATE_LIMIT_MAX ?? 200);
  const authMax = Number(process.env.RATE_LIMIT_AUTH_MAX ?? 20);

  const globalLimiter = rateLimit({ windowMs, max, standardHeaders: true, legacyHeaders: false });
  const authLimiter = rateLimit({ windowMs, max: authMax, standardHeaders: true, legacyHeaders: false });

  app.use(globalLimiter);

  // учитываем prefix
  const base = prefix ? `/${prefix}` : '';
  app.use(`${base}/auth`, authLimiter);
  app.use(`${base}/admin`, authLimiter);

  // RequestId
  app.use(new RequestIdMiddleware().use);

  // Logger (HTTP)
  const logger = app.get(AppLoggerService);
  app.useLogger(logger);

  // Global pipes/filters/interceptors
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


  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
}
bootstrap();
