import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { swaggerOptions, swaggerTitle, swaggerDescription } from './common';
import { IpRestrictionMiddleware } from './common/middleware/ip-restriction.middleware';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { main as seedDatabase } from '../prisma/seed/seed';

export async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  // Add a route to redirect /:software/:version/:arch to /api/:software/:version/:arch
  app.getHttpAdapter().all('/:software/:version/:arch', (req, res, next) => {
    // Check if the request starts with /api/
    if (req.url.startsWith('/api/')) {
      // Let the /api/ route handlers take over
      return next();
    }

    // Otherwise, redirect to /api/:software/:version/:arch
    const { software, version, arch } = req.params;
    const targetUrl = `/api/${software}/${version}/${arch}`;

    // Proxy the request to the new URL
    req.url = targetUrl;
    next();
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new PrismaExceptionFilter());

  // Start Swagger Configurations --------------------------------
  const config = new DocumentBuilder()
    .setTitle(swaggerTitle)
    .setDescription(swaggerDescription)
    .setContact(
      'DEVOLUT',
      'mailto:hubert.cole@devolut.fr',
      'hubert.cole@devolut.fr',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addApiKey(
      {
        type: 'apiKey',
        name: 'x-api-key',
        in: 'header',
        description: 'Proxy token (revocable)',
      },
      'api-key',
    )
    .addSecurityRequirements('api-key')
    .build();
  const document = SwaggerModule.createDocument(app, config);

  if (process.env.ENABLE_SWAGGER === 'true')
    SwaggerModule.setup('swagger', app, document, swaggerOptions);
  // End Swagger Configurations --------------------------------

  //Enable CORS
  app.enableCors();

  //Enable IP Restriction Middleware
  app.use(new IpRestrictionMiddleware().use);

  // Call the seed script
  await seedDatabase();

  await app.listen(3000);
  Logger.log(`App running on Port 3000`);
}
bootstrap();
