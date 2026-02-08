import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';

function setEnvIfMissing(key: string, value: string): void {
  if (!process.env[key]) {
    // ProcessEnv is readonly in current Node typings, so mutate via cast.
    (process.env as Record<string, string | undefined>)[key] = value;
  }
}

async function generate() {
  process.on('unhandledRejection', (error) => {
    if (
      process.env.SKIP_EXTERNALS === 'true' &&
      error instanceof Error &&
      error.message === 'Connection is closed.'
    ) {
      return;
    }
    throw error;
  });

  setEnvIfMissing('NODE_ENV', 'development');
  setEnvIfMissing(
    'DATABASE_URL',
    'postgresql://postgres:postgres@localhost:5433/intercity?schema=public',
  );
  setEnvIfMissing(
    'SHADOW_DATABASE_URL',
    'postgresql://postgres:postgres@localhost:5433/intercity_shadow?schema=public',
  );
  setEnvIfMissing('REDIS_URL', 'redis://localhost:6379');
  setEnvIfMissing('JWT_ACCESS_SECRET', 'dev_access_secret_1234567890');
  setEnvIfMissing('JWT_REFRESH_SECRET', 'dev_refresh_secret_1234567890');
  setEnvIfMissing('JWT_ACCESS_TTL', '900');
  setEnvIfMissing('JWT_REFRESH_TTL', '2592000');
  setEnvIfMissing('OFFERS_MAX_DRIVER', '3');
  setEnvIfMissing('OFFERS_MAX_PASSENGER', '3');
  setEnvIfMissing('SKIP_EXTERNALS', 'true');

  const outputPath = resolve(process.cwd(), 'docs', 'openapi.json');

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { AppModule } = require('../src/app.module') as typeof import('../src/app.module');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { bootstrapApp } = require('../src/app.bootstrap') as typeof import('../src/app.bootstrap');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { buildSwaggerDocument } = require('../src/common/swagger') as typeof import('../src/common/swagger');
    const app = await NestFactory.create(AppModule, {
      logger: false,
      abortOnError: false,
    });
    bootstrapApp(app, { enableSwagger: false, enableLogger: false });

    const document = buildSwaggerDocument(app);
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, JSON.stringify(document, null, 2));

    await app.close();
    process.exitCode = 0;
  } catch (error) {
    console.error('OpenAPI generation failed.');
    console.error(error);
    if (existsSync(outputPath)) {
      console.warn('Using existing docs/openapi.json as fallback.');
      process.exitCode = 0;
      return;
    }
    process.exitCode = 1;
    throw error;
  }
}

void generate();
