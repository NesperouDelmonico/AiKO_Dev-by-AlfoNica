import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { json, urlencoded } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';
import { parseTrustProxy } from './trust-proxy';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  const expressInstance = app.getHttpAdapter().getInstance() as {
    set: (key: string, value: boolean | number) => void;
  };
  expressInstance.set('trust proxy', parseTrustProxy(process.env.TRUST_PROXY));
  const logger = new Logger('Http');
  const isProduction = process.env.NODE_ENV === 'production';
  const allowedOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (isProduction && allowedOrigins.length === 0) {
    throw new Error('CORS_ORIGINS debe configurarse en producción');
  }
  const bodyLimit = process.env.API_BODY_LIMIT ?? '100kb';
  app.use(helmet());
  // Las imágenes de ejercicios llegan en base64 (máx. 1,5 MB → ~2 MB);
  // este parser va antes del general para que su límite aplique.
  app.use('/v1/imagenes', json({ limit: '2200kb' }));
  app.use(json({ limit: bodyLimit }));
  app.use(urlencoded({ extended: true, limit: bodyLimit }));
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin || !isProduction || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Origen no permitido por CORS'), false);
    },
    credentials: true,
  });
  app.use((request: Request, response: Response, next: NextFunction) => {
    const startedAt = Date.now();
    response.on('finish', () => {
      logger.log(
        `${request.method} ${response.statusCode} ${Date.now() - startedAt}ms`,
      );
    });
    next();
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.setGlobalPrefix('v1');
  const config = new DocumentBuilder()
    .setTitle('AiKO API')
    .setDescription('API REST de rehabilitación cognitiva gamificada de AiKO.')
    .setVersion('1.0.0')
    .addTag('Administración')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'bearerAuth',
    )
    .build();
  if (!isProduction || process.env.SWAGGER_ENABLED === 'true') {
    SwaggerModule.setup('api', app, SwaggerModule.createDocument(app, config));
  }
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap().catch((error: unknown) => {
  // Sin esto el error de arranque (p. ej. la BD inalcanzable) no llega a los logs.
  new Logger('Bootstrap').error(
    'La aplicación no pudo iniciar',
    error instanceof Error ? error.stack : String(error),
  );
  process.exit(1);
});
