import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { bootstrapApp } from './app.bootstrap';
import { initSentry } from './infrastructure/sentry/sentry';

async function bootstrap() {
  initSentry();
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  bootstrapApp(app);

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
}

void bootstrap();
