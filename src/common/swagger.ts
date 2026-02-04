import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function buildSwaggerConfig() {
  return new DocumentBuilder()
    .setTitle('InterCity API')
    .setDescription('Backend API')
    .setVersion('1.0.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'bearer',
    )
    .build();
}

export function buildSwaggerDocument(app: INestApplication) {
  const config = buildSwaggerConfig();
  return SwaggerModule.createDocument(app, config);
}

export function setupSwagger(app: INestApplication) {
  const document = buildSwaggerDocument(app);
  SwaggerModule.setup('swagger', app, document);
}
