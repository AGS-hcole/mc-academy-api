import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Res,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { Response } from 'express';
import { EventsService } from './events.service';
import {
  CreateEventDto,
  UpdateEventDto,
  QueryEventsDto,
  EventResponseDto,
  PaginatedEventsResponseDto,
} from './dto';
import { AdminGuard } from '../../auth/guards/admin.guard';
import { generateQrPng } from './utils/qr.util';

@ApiTags('Events')
@Controller()
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  // ========== Public Routes ==========

  @Get('public/events')
  @ApiOperation({
    summary: 'List published events (public)',
    description:
      'Returns a paginated list of published events. Supports filtering by active status, search, and date ranges.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of published events',
    type: PaginatedEventsResponseDto,
  })
  async listPublic(
    @Query() query: QueryEventsDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<PaginatedEventsResponseDto> {
    // Set cache control header for public endpoint
    res.setHeader('Cache-Control', 'public, max-age=60');

    // Force activeOnly default to true for public
    if (query.activeOnly === undefined) {
      query.activeOnly = true;
    }

    return this.eventsService.listPublic(query);
  }

  @Get('public/events/qr')
  @ApiOperation({
    summary: 'Generate QR code for events page (public)',
    description:
      'Generates a PNG QR code that points to the provided URL or a default events page URL.',
  })
  @ApiQuery({
    name: 'url',
    required: false,
    description: 'Target URL for the QR code',
    example: 'https://mycenter.academy/events',
  })
  @ApiResponse({
    status: 200,
    description: 'QR code PNG image',
    content: {
      'image/png': {},
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid URL provided' })
  async generateQr(
    @Query('url') url: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    // Default URL if not provided
    const targetUrl = url || 'https://mycenter.academy/events';

    // Basic URL validation
    try {
      new URL(targetUrl);
    } catch (error) {
      throw new BadRequestException('Invalid URL provided');
    }

    const buffer = await generateQrPng(targetUrl);

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(buffer);
  }

  @Get('public/events/:slug')
  @ApiOperation({
    summary: 'Get published event by slug (public)',
    description: 'Returns details of a single published event by its slug.',
  })
  @ApiResponse({
    status: 200,
    description: 'Event details',
    type: EventResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Event not found or not published' })
  async getPublicBySlug(
    @Param('slug') slug: string,
  ): Promise<EventResponseDto> {
    return this.eventsService.getPublicBySlug(slug);
  }

  // ========== Admin Routes ==========

  @Get('admin/events')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List all events (admin only)',
    description:
      'Returns a paginated list of all events with optional filters. No restrictions on published status.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of events',
    type: PaginatedEventsResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  async adminList(
    @Query() query: QueryEventsDto,
  ): Promise<PaginatedEventsResponseDto> {
    // Override publishedOnly default for admin
    if (query.publishedOnly === undefined) {
      query.publishedOnly = false;
    }
    return this.eventsService.adminList(query);
  }

  @Get('admin/events/:id')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get event by ID (admin only)',
    description: 'Returns details of a single event by its ID.',
  })
  @ApiResponse({
    status: 200,
    description: 'Event details',
    type: EventResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async adminGet(@Param('id') id: string): Promise<EventResponseDto> {
    return this.eventsService.adminGet(id);
  }

  @Post('admin/events')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a new event (admin only)',
    description:
      'Creates a new event. If slug is not provided, it will be generated from the name.',
  })
  @ApiResponse({
    status: 201,
    description: 'Event created successfully',
    type: EventResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - Validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({ status: 409, description: 'Conflict - Slug already exists' })
  async create(@Body() createDto: CreateEventDto): Promise<EventResponseDto> {
    return this.eventsService.create(createDto);
  }

  @Patch('admin/events/:id')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update an event (admin only)',
    description: 'Updates an existing event. All fields are optional.',
  })
  @ApiResponse({
    status: 200,
    description: 'Event updated successfully',
    type: EventResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - Validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({ status: 404, description: 'Event not found' })
  @ApiResponse({ status: 409, description: 'Conflict - Slug already exists' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateEventDto,
  ): Promise<EventResponseDto> {
    return this.eventsService.update(id, updateDto);
  }

  @Delete('admin/events/:id')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete an event (admin only)',
    description: 'Permanently deletes an event.',
  })
  @ApiResponse({ status: 204, description: 'Event deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async delete(@Param('id') id: string, @Res() res: Response): Promise<void> {
    await this.eventsService.delete(id);
    res.status(HttpStatus.NO_CONTENT).send();
  }
}
