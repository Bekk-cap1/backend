import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { initSentry } from './infrastructure/sentry/sentry';

async function bootstrapWorker() {
  initSentry();
  const app = await NestFactory.createApplicationContext(AppModule, {
    bufferLogs: true,
  });

  const logger = new Logger('Worker');
  logger.log('Outbox worker started');

  const shutdown = async (signal: string) => {
    logger.log(`Shutting down worker on ${signal}`);
    await app.close();
    process.exit(0);
  };

  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });
  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
}

void bootstrapWorker();
