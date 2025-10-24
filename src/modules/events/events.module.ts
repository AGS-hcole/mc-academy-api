import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
    }),
  ],
  controllers: [EventsController],
  providers: [EventsService, PrismaService],
  exports: [EventsService],
})
export class EventsModule {}
