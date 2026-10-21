import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.use(helmet());
  app.enableCors({ origin: process.env.WEB_ORIGIN ?? 'http://localhost:5173' });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const doc = SwaggerModule.createDocument(
    app,
    new DocumentBuilder().setTitle('TCAPS API').addBearerAuth().build(),
  );
  SwaggerModule.setup('api/docs', app, doc);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`API running at http://localhost:${port}/api  (docs: /api/docs)`);
}
bootstrap();
