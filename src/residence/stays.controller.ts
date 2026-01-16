import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Req,
  ParseBoolPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { StaysService } from './stays.service';
import { CreateStayDto, CancelStayDto } from './dto';
import { AuthGuard } from '../auth/guards/auth.guards';
import { AdminGuard } from '../auth/guards/admin.guard';

@ApiTags('residence/stays')
@ApiBearerAuth()
@Controller('residence/stays')
export class StaysController {
  constructor(private readonly staysService: StaysService) {}

  @Get('me')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Get current user stays' })
  @ApiQuery({
    name: 'from',
    required: false,
    type: String,
    description: 'Start date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    type: String,
    description: 'End date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'includeCanceled',
    required: false,
    type: Boolean,
    description: 'Include canceled stays',
  })
  @ApiResponse({ status: 200, description: 'List of user stays' })
  async getMyStays(
    @Req() req: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('includeCanceled', new ParseBoolPipe({ optional: true }))
    includeCanceled?: boolean,
  ) {
    return this.staysService.getMyStays(
      req.user.id,
      from,
      to,
      includeCanceled || false,
    );
  }

  @Post()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Create a stay (register for a night)' })
  @ApiResponse({ status: 201, description: 'Stay created' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 403, description: 'Cutoff time passed or forbidden' })
  @ApiResponse({ status: 404, description: 'Manor not found' })
  @ApiResponse({ status: 409, description: 'Capacity reached' })
  async createStay(@Req() req: any, @Body() dto: CreateStayDto) {
    const isAdmin = req.user.role === 'admin';
    return this.staysService.createStay(dto, req.user.id, isAdmin);
  }

  @Post('cancel')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Cancel a stay' })
  @ApiResponse({ status: 200, description: 'Stay canceled' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 403, description: 'Cutoff time passed or forbidden' })
  @ApiResponse({ status: 404, description: 'Stay not found' })
  async cancelStay(@Req() req: any, @Body() dto: CancelStayDto) {
    const isAdmin = req.user.role === 'admin';
    return this.staysService.cancelStay(dto, req.user.id, isAdmin);
  }

  @Get()
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Admin: Get stays report for a manor on a date' })
  @ApiQuery({
    name: 'date',
    required: true,
    type: String,
    description: 'Date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'manorId',
    required: true,
    type: String,
    description: 'Manor ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Stays report with occupancy summary',
  })
  @ApiResponse({ status: 400, description: 'Invalid date format' })
  @ApiResponse({ status: 404, description: 'Manor not found' })
  async getManorStaysReport(
    @Query('date') date: string,
    @Query('manorId') manorId: string,
  ) {
    return this.staysService.getManorStaysReport(manorId, date);
  }
}
