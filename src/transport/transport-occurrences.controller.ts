import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { TransportOccurrencesService } from './transport-occurrences.service';
import {
  ListOccurrencesQueryDto,
  CreateBookingDto,
  CancelOccurrenceDto,
} from './dto';
import { AuthGuard } from '../auth/guards/auth.guards';
import { AdminGuard } from '../auth/guards/admin.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '@prisma/client';

@ApiTags('transport-occurrences')
@ApiBearerAuth()
@Controller('transport-occurrences')
export class TransportOccurrencesController {
  constructor(
    private readonly occurrencesService: TransportOccurrencesService,
  ) {}

  @Get()
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: 'List transport occurrences (AUTH required)',
    description: 'Get all transport occurrences within a date range with booking information',
  })
  @ApiResponse({ status: 200, description: 'List of occurrences' })
  findAll(@Query() query: ListOccurrencesQueryDto) {
    return this.occurrencesService.findAll(query);
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: 'Get a transport occurrence by ID (AUTH required)',
    description: 'Returns occurrence details including user\'s booking status. Admins see all bookings.',
  })
  @ApiResponse({ status: 200, description: 'Occurrence details' })
  @ApiResponse({ status: 404, description: 'Occurrence not found' })
  findOne(@Param('id') id: string, @GetUser() user: User) {
    const isAdmin = user.role === 'admin';
    return this.occurrencesService.findOne(id, user.id, isAdmin);
  }

  @Post(':id/book')
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: 'Book a transport occurrence (AUTH required)',
    description: 'Create a booking for a transport. Validates cutoff time and capacity.',
  })
  @ApiResponse({ status: 201, description: 'Booking created successfully' })
  @ApiResponse({ status: 400, description: 'Cutoff passed or not enough seats' })
  @ApiResponse({ status: 404, description: 'Occurrence not found' })
  @ApiResponse({ status: 409, description: 'Booking already exists' })
  book(
    @Param('id') id: string,
    @GetUser() user: User,
    @Body() createBookingDto: CreateBookingDto,
  ) {
    return this.occurrencesService.book(id, user.id, createBookingDto);
  }

  @Post(':id/cancel')
  @UseGuards(AdminGuard)
  @ApiOperation({
    summary: 'Cancel a transport occurrence (ADMIN only)',
    description: 'Cancel an occurrence. Sets status to CANCELLED.',
  })
  @ApiResponse({ status: 200, description: 'Occurrence cancelled' })
  @ApiResponse({ status: 404, description: 'Occurrence not found' })
  cancel(@Param('id') id: string, @Body() cancelDto: CancelOccurrenceDto) {
    return this.occurrencesService.cancel(id, cancelDto);
  }
}
