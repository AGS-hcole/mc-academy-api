import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TransportPlansService } from './transport-plans.service';
import { CreateTransportWeekPlanDto } from './dto';
import { AuthGuard } from '../auth/guards/auth.guards';
import { AdminGuard } from '../auth/guards/admin.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '@prisma/client';

@ApiTags('Transport Plans')
@Controller('transport/week-plans')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class TransportPlansController {
  constructor(private readonly transportPlansService: TransportPlansService) {}

  @Post()
  @ApiOperation({
    summary: 'Create or update transport week plan',
    description:
      'Students can create their own plan during the weekend window. Admins can create plans anytime for any student.',
  })
  async createWeekPlan(
    @Body() dto: CreateTransportWeekPlanDto,
    @GetUser() user: User,
  ) {
    return this.transportPlansService.createOrUpdateWeekPlan(dto, user);
  }

  @Get('me')
  @ApiOperation({
    summary: 'Get current user transport week plan',
    description: 'Get the transport week plan for the authenticated user.',
  })
  async getMyWeekPlan(
    @Query('weekStart') weekStart: string,
    @GetUser() user: User,
  ) {
    return this.transportPlansService.getMyWeekPlan(weekStart, user);
  }

  @Get(':studentId')
  @ApiOperation({
    summary: 'Get transport week plan for a student',
    description: 'Admin only: Get the transport week plan for any student.',
  })
  async getWeekPlan(
    @Param('studentId') studentId: string,
    @Query('weekStart') weekStart: string,
    @GetUser() user: User,
  ) {
    return this.transportPlansService.getWeekPlan(studentId, weekStart, user);
  }

  @Get()
  @UseGuards(AdminGuard)
  @ApiOperation({
    summary: 'Get all transport plans for a week',
    description: 'Admin only: Get all transport plans for a specific week.',
  })
  async getAllPlansForWeek(
    @Query('weekStart') weekStart: string,
    @GetUser() user: User,
  ) {
    return this.transportPlansService.getAllPlansForWeek(weekStart, user);
  }
}
