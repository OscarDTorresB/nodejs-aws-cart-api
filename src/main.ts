import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';
import express from 'express';
import { ExpressAdapter } from '@nestjs/platform-express';
import serverless from 'serverless-http';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrapServerless() {
  const expressApp = express();
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressApp),
  );

  app.enableCors({
    origin: (req, callback) => callback(null, true),
  });
  app.use(helmet());
  const config = new DocumentBuilder()
    .setTitle('CloudX Cart API - PROD')
    .setDescription('CloudX Cart API documentation')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('swagger', app, document);

  await app.init();

  return serverless(expressApp);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get('APP_PORT') || 4000;

  app.enableCors({
    origin: (req, callback) => callback(null, true),
  });
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          upgradeInsecureRequests: null,
        },
      },
    }),
  );
  const config = new DocumentBuilder()
    .setTitle('CloudX Cart API - DEV')
    .setDescription('CloudX Cart API documentation')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('swagger', app, document);

  await app.listen(port);
  console.log(`Application is running on: ${await app.getUrl()}`);
}

let server: any;

export const handler = async (event: any, context: any) => {
  if (!server) {
    server = await bootstrapServerless();
  }
  return server(event, context);
};

if (process.env.NODE_ENV === 'local') {
  void bootstrap();
}
