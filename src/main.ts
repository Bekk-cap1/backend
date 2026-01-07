import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { bootstrapApp } from './app.bootstrap';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  bootstrapApp(app);

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
}

void bootstrap();
