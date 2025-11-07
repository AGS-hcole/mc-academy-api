// src/sessions/sessions.module.ts
import { Module } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { SessionsController } from './sessions.controller';
import { SessionsCron } from './sessions.cron';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationsService } from 'src/notifications/notifications.service';
import { AuthModule } from 'src/auth/auth.module';
import { EmailService } from 'src/common/email.service';

@Module({
  controllers: [SessionsController],
  imports: [AuthModule],
  providers: [
    SessionsService,
    SessionsCron,
    PrismaService,
    NotificationsService,
    EmailService,
  ],
})
export class SessionsModule {}
