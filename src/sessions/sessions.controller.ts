// src/sessions/sessions.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  Req,
} from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { AttendanceStatus, SessionSlot } from '@prisma/client';
import { CreateSessionDto, UpdateSessionDto, AdminRegisterDto } from './dto';

@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessions: SessionsService) {}

  @Get('upcoming')
  async getUpcoming() {
    return this.sessions.getUpcomingSessions();
  }

  @Get()
  async getSessions(
    @Query('siteId') siteId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('slot') slot?: SessionSlot,
    @Query('isPublished') isPublished?: string,
    @Query('isCanceled') isCanceled?: string,
  ) {
    const filters = {
      siteId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      slot,
      isPublished:
        isPublished !== undefined ? isPublished === 'true' : undefined,
      isCanceled: isCanceled !== undefined ? isCanceled === 'true' : undefined,
    };

    return this.sessions.getAllSessions(filters);
  }

  @Get(':id')
  async getSession(@Param('id') id: string) {
    return this.sessions.getSessionById(id);
  }

  @Post()
  // @UseGuards(AdminGuard) // Uncomment when admin guard is available
  async createSession(@Body() dto: CreateSessionDto) {
    return this.sessions.createSession(dto);
  }

  @Put(':id')
  // @UseGuards(AdminGuard) // Uncomment when admin guard is available
  async updateSession(@Param('id') id: string, @Body() dto: UpdateSessionDto) {
    return this.sessions.updateSession(id, dto);
  }

  @Delete(':id')
  // @UseGuards(AdminGuard) // Uncomment when admin guard is available
  async deleteSession(@Param('id') id: string) {
    return this.sessions.deleteSession(id);
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

  @Post(':id/admin-register')
  // @UseGuards(AdminGuard) // Uncomment when admin guard is available
  async adminRegister(
    @Param('id') sessionId: string,
    @Body() dto: AdminRegisterDto,
    @Req() req: any, // replace with your AuthGuard user
  ) {
    const adminUser = req.user;
    return this.sessions.adminRegister(sessionId, dto, adminUser);
  }
}
