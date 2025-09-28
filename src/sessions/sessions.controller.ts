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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { SessionsService } from './sessions.service';
import { AttendanceStatus, SessionSlot } from '@prisma/client';
import { CreateSessionDto, UpdateSessionDto, AdminRegisterDto } from './dto';

@ApiTags('sessions')
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessions: SessionsService) {}

  @Get('upcoming')
  @ApiOperation({ summary: 'Get upcoming sessions' })
  @ApiResponse({ status: 200, description: 'List of upcoming sessions' })
  async getUpcoming() {
    return this.sessions.getUpcomingSessions();
  }

  @Get()
  @ApiOperation({ summary: 'Get sessions with optional filters' })
  @ApiQuery({
    name: 'siteId',
    required: false,
    description: 'Filter by site ID',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Filter by start date (ISO string)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'Filter by end date (ISO string)',
  })
  @ApiQuery({
    name: 'slot',
    required: false,
    enum: SessionSlot,
    description: 'Filter by session slot',
  })
  @ApiQuery({
    name: 'isPublished',
    required: false,
    type: Boolean,
    description: 'Filter by published status',
  })
  @ApiQuery({
    name: 'isCanceled',
    required: false,
    type: Boolean,
    description: 'Filter by canceled status',
  })
  @ApiResponse({
    status: 200,
    description: 'List of sessions matching filters',
  })
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
  @ApiOperation({ summary: 'Create a new session (admin only)' })
  @ApiBody({ type: CreateSessionDto })
  @ApiResponse({ status: 201, description: 'Session created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 404, description: 'Site not found' })
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
