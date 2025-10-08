// src/sessions/sessions.module.ts
import { Module } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { SessionsController } from './sessions.controller';
import { SessionsCron } from './sessions.cron';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationsService } from 'src/notifications/notifications.service';

@Module({
  controllers: [SessionsController],
  providers: [
    SessionsService,
    SessionsCron,
    PrismaService,
    NotificationsService,
  ],
})
export class SessionsModule {}
