// src/sessions/sessions.module.ts
import { Module } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { SessionsController } from './sessions.controller';
import { SessionsCron } from './sessions.cron';

@Module({
  controllers: [SessionsController],
  providers: [SessionsService, SessionsCron],
})
export class SessionsModule {}
