import './setup/prisma-polyfill';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { randomUUID } from 'crypto';
import pinoHttp from 'pino-http';
import { env } from '@propad/config';
import { resolve } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true
  });

  const logger = new Logger('HTTP');
  app.useLogger(logger);
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:', 'http://localhost:3001', 'http://localhost:3000'],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https:'],
      },
    },
  }));
  app.use(cookieParser());
  app.use(
    pinoHttp({
      genReqId: () => randomUUID(),
      transport:
        process.env.NODE_ENV !== 'production'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined
    })
  );

  // Serve uploaded files statically from the same root path used by uploadLocalMedia (resolve('uploads', ...))
  const uploadsRoot = resolve('uploads');
  app.useStaticAssets(uploadsRoot, {
    prefix: '/uploads/'
  });

  app.enableCors({
    origin: env.WEB_ORIGIN?.split(',') ?? '*',
    credentials: true
  });

  // Hard fail if enum objects are undefined at runtime
  const { PropertyTypeEnum, PropertyFurnishingEnum, PowerPhaseEnum, GeoLevelEnum, PropertyAvailabilityEnum, CurrencyEnum } = await import('@propad/config');
  if (!PropertyTypeEnum) throw new Error('PropertyTypeEnum missing at runtime');
  if (!PropertyFurnishingEnum) throw new Error('PropertyFurnishingEnum missing at runtime');
  if (!PowerPhaseEnum) throw new Error('PowerPhaseEnum missing at runtime');
  if (!GeoLevelEnum) throw new Error('GeoLevelEnum missing at runtime');
  if (!PropertyAvailabilityEnum) throw new Error('PropertyAvailabilityEnum missing at runtime');
  if (!CurrencyEnum) throw new Error('CurrencyEnum missing at runtime');

  const port = env.PORT ?? 3001;
  await app.listen(port, '0.0.0.0');
  logger.log(`API listening on port ${port}`);
}

bootstrap();
