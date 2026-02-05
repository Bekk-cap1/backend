import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';

async function generate() {
  process.env.NODE_ENV = process.env.NODE_ENV ?? 'development';
  process.env.DATABASE_URL =
    process.env.DATABASE_URL ??
    'postgresql://postgres:postgres@localhost:5433/intercity?schema=public';
  process.env.SHADOW_DATABASE_URL =
    process.env.SHADOW_DATABASE_URL ??
    'postgresql://postgres:postgres@localhost:5433/intercity_shadow?schema=public';
  process.env.REDIS_URL =
    process.env.REDIS_URL ?? 'redis://localhost:6379';
  process.env.JWT_ACCESS_SECRET =
    process.env.JWT_ACCESS_SECRET ?? 'dev_access_secret_1234567890';
  process.env.JWT_REFRESH_SECRET =
    process.env.JWT_REFRESH_SECRET ?? 'dev_refresh_secret_1234567890';
  process.env.JWT_ACCESS_TTL = process.env.JWT_ACCESS_TTL ?? '900';
  process.env.JWT_REFRESH_TTL = process.env.JWT_REFRESH_TTL ?? '2592000';
  process.env.OFFERS_MAX_DRIVER = process.env.OFFERS_MAX_DRIVER ?? '3';
  process.env.OFFERS_MAX_PASSENGER = process.env.OFFERS_MAX_PASSENGER ?? '3';
  process.env.SKIP_EXTERNALS = process.env.SKIP_EXTERNALS ?? 'true';

  const outputPath = resolve(process.cwd(), 'docs', 'openapi.json');

  try {
    const { AppModule } =
      await import('../src/app.module');
    const { bootstrapApp } =
      await import('../src/app.bootstrap');
    const { buildSwaggerDocument } =
      await import('../src/common/swagger');

    const app = await NestFactory.create(AppModule, { logger: false });
    bootstrapApp(app, { enableSwagger: false, enableLogger: false });

    const document = buildSwaggerDocument(app);
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, JSON.stringify(document, null, 2));

    await app.close();
  } catch (error) {
    console.error('OpenAPI generation failed.');
    console.error(error);
    if (existsSync(outputPath)) {
      console.warn('Using existing docs/openapi.json as fallback.');
      return;
    }
    throw error;
  }
}

void generate();
