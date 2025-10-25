import './setup/prisma-polyfill';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { randomUUID } from 'crypto';
import pinoHttp from 'pino-http';
import { env } from '@propad/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true
  });

  const logger = new Logger('HTTP');
  app.useLogger(logger);
  app.use(helmet());
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

  app.enableCors({
    origin: env.WEB_ORIGIN?.split(',') ?? '*',
    credentials: true
  });

  const port = env.PORT ?? 3001;
  await app.listen(port);
  logger.log(`API listening on port ${port}`);
}

bootstrap();
