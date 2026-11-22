import { StandardSchemaValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule, ObserveInstrument } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
  });

  const config = app.get(ConfigService);
  const apiVersion = config.get<string>('API_VERSION') || '1';

  const frontendUrl = config.get<string>('FRONTEND_URL');
  app.enableCors({
    origin: frontendUrl
      ? frontendUrl.split(',').map((url) => url.trim())
      : true,
    credentials: true,
  });

  app.useGlobalPipes(new StandardSchemaValidationPipe());

  app.setGlobalPrefix('api');

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: apiVersion,
  });

  await app.listen(config.get<number>('PORT') || 3000);
}
await bootstrap();
