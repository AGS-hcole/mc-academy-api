// src/sessions/sessions.controller.ts
import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { AttendanceStatus } from '@prisma/client';

@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessions: SessionsService) {}

  @Get('upcoming')
  async getUpcoming() {
    return this.sessions.getUpcomingSessions();
  }

  @Post(':id/rsvp')
  async rsvp(
    @Param('id') sessionId: string,
    @Req() req: any, // replace with your AuthGuard user
    @Body() body: { status: AttendanceStatus; comment?: string },
  ) {
    const userId = req.user.id;
    return this.sessions.rsvp(sessionId, userId, body.status, body.comment);
  }
}
