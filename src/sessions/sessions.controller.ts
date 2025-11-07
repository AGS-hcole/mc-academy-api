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
  UseGuards,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { SessionsService } from './sessions.service';
import { SessionSlot } from '@prisma/client';
import { CreateSessionDto, UpdateSessionDto, AdminRegisterDto } from './dto';
import { AuthGuard } from 'src/auth/guards/auth.guards';
import { RsvpDto } from './dto/rsvp.dto';
import { SessionsCron } from './sessions.cron';

@ApiTags('sessions')
@Controller('sessions')
export class SessionsController {
  constructor(
    private readonly sessions: SessionsService,
    private readonly cron: SessionsCron,
  ) {}

  @Get('upcoming')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Get upcoming sessions' })
  @ApiResponse({ status: 200, description: 'List of upcoming sessions' })
  async getUpcoming() {
    return this.sessions.getUpcomingSessions();
  }

  @Get()
  @UseGuards(AuthGuard)
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
  @UseGuards(AuthGuard)
  async getSession(@Param('id') id: string) {
    return this.sessions.getSessionById(id);
  }

  @Post()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Create a new session (admin only)' })
  @ApiBody({ type: CreateSessionDto })
  @ApiResponse({ status: 201, description: 'Session created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 404, description: 'Site not found' })
  async createSession(@Body() dto: CreateSessionDto) {
    return this.sessions.createSession(dto);
  }

  @Put(':id')
  @UseGuards(AuthGuard)
  async updateSession(@Param('id') id: string, @Body() dto: UpdateSessionDto) {
    return this.sessions.updateSession(id, dto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  async deleteSession(@Param('id') id: string) {
    return this.sessions.deleteSession(id);
  }

  @Post(':id/rsvp')
  @UseGuards(AuthGuard)
  async rsvp(
    @Param('id') sessionId: string,
    @Req() req: any,
    @Body() body: RsvpDto,
  ) {
    const userId = req.user?.id ?? req.user?.sub;

    if (!userId) throw new UnauthorizedException('User missing');

    await this.sessions.rsvp(sessionId, userId, body.status, body.comment);

    return this.sessions.getSessionById(sessionId);
  }

  @Post(':id/admin-rsvp')
  @UseGuards(AuthGuard)
  async adminRsvp(
    @Param('id') sessionId: string,
    @Body() dto: AdminRegisterDto,
    @Req() req: any,
  ) {
    const adminUser = req.user;

    await this.sessions.adminRegister(sessionId, dto, adminUser);

    return this.sessions.getSessionById(sessionId);
  }

  // ---------- Cron job triggers ----------

  @Post('trigger-generate')
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: 'Trigger manual: generate next week sessions (admin)',
  })
  @ApiResponse({ status: 200, description: 'Generation launched' })
  async triggerGenerate(@Req() req: any) {
    const user = req.user;
    if (!user) throw new UnauthorizedException();
    if (user.role !== 'admin') throw new ForbiddenException('Admins only');

    await this.cron.generateSessions();
    return { ok: true, action: 'generateSessions' };
  }

  @Post('trigger-publish')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Trigger manual: publish sessions (admin)' })
  @ApiResponse({ status: 200, description: 'Publish launched' })
  async triggerPublish(@Req() req: any) {
    const user = req.user;
    if (!user) throw new UnauthorizedException();
    if (user.role !== 'admin') throw new ForbiddenException('Admins only');

    await this.cron.publishSessions();
    return { ok: true, action: 'publishSessions' };
  }

  @Post('trigger-reminders')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Trigger manual: day-before reminders (admin)' })
  @ApiResponse({ status: 200, description: 'Reminders launched' })
  async triggerReminders(@Req() req: any) {
    const user = req.user;
    if (!user) throw new UnauthorizedException();
    if (user.role !== 'admin') throw new ForbiddenException('Admins only');

    await this.cron.dayBeforeReminders();
    return { ok: true, action: 'dayBeforeReminders' };
  }
}
