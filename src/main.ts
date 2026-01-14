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
  const logger = new Logger('Bootstrap');

  app.setGlobalPrefix('api');

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
    .build();
  const document = SwaggerModule.createDocument(app, config);

  if (process.env.ENABLE_SWAGGER === 'true') {
    SwaggerModule.setup('swagger', app, document, swaggerOptions);
    logger.log('✅ Swagger UI is enabled at /swagger');
  } else {
    logger.warn('⚠️ Swagger UI is disabled (ENABLE_SWAGGER != true)');
  }
  // End Swagger Configurations --------------------------------

  //Enable CORS
  app.enableCors();

  //Enable IP Restriction Middleware
  app.use(new IpRestrictionMiddleware().use);

  // Call the seed script
  //await seedDatabase();

  await app.listen(3000);
  Logger.log(`App running on Port 3000`);
}
bootstrap();
