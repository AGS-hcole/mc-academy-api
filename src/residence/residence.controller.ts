import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Query,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ResidenceService } from './residence.service';
import { CreateResidenceWeekPlanDto, ConfirmPresenceDto } from './dto';
import { AuthGuard } from '../auth/guards/auth.guards';
import { AdminGuard } from '../auth/guards/admin.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '@prisma/client';

@ApiTags('Residence')
@Controller('residence')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class ResidenceController {
  constructor(private readonly residenceService: ResidenceService) {}

  @Post('week-plans')
  @ApiOperation({
    summary: 'Create or update residence week plan',
    description:
      'Students can create their own plan during the weekend window. Admins can create plans anytime for any student.',
  })
  async createWeekPlan(
    @Body() dto: CreateResidenceWeekPlanDto,
    @GetUser() user: User,
  ) {
    return this.residenceService.createOrUpdateWeekPlan(dto, user);
  }

  @Get('week-plans/me')
  @ApiOperation({
    summary: 'Get current user residence week plan',
    description: 'Get the residence week plan for the authenticated user.',
  })
  async getMyWeekPlan(
    @Query('weekStart') weekStart: string,
    @GetUser() user: User,
  ) {
    return this.residenceService.getMyWeekPlan(weekStart, user);
  }

  @Get('week-plans/:studentId')
  @ApiOperation({
    summary: 'Get residence week plan for a student',
    description: 'Admin only: Get the residence week plan for any student.',
  })
  async getWeekPlan(
    @Param('studentId') studentId: string,
    @Query('weekStart') weekStart: string,
    @GetUser() user: User,
  ) {
    return this.residenceService.getWeekPlan(studentId, weekStart, user);
  }

  @Get('week-plans')
  @UseGuards(AdminGuard)
  @ApiOperation({
    summary: 'Get all residence plans for a week',
    description: 'Admin only: Get all residence plans for a specific week.',
  })
  async getAllPlansForWeek(
    @Query('weekStart') weekStart: string,
    @GetUser() user: User,
  ) {
    return this.residenceService.getAllPlansForWeek(weekStart, user);
  }

  @Patch('confirm')
  @UseGuards(AdminGuard)
  @ApiOperation({
    summary: 'Confirm student presence for a night',
    description: 'Admin only: Mark whether a student was actually present.',
  })
  async confirmPresence(
    @Body() dto: ConfirmPresenceDto,
    @GetUser() user: User,
  ) {
    return this.residenceService.confirmPresence(dto, user);
  }
}
