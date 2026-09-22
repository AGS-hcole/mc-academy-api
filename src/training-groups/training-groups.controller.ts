import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from 'src/auth/guards/admin.guard';
import {
  CreateTrainingGroupDto,
  CreateTrainingGroupScheduleDto,
  TrainingGroupMemberBulkDto,
  UpdateTrainingGroupDto,
  UpdateTrainingGroupScheduleDto,
} from './dto';
import { TrainingGroupsService } from './training-groups.service';

@ApiTags('training-groups')
@ApiBearerAuth()
@Controller('training-groups')
@UseGuards(AdminGuard)
export class TrainingGroupsController {
  constructor(private readonly trainingGroupsService: TrainingGroupsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a training group (ADMIN only)' })
  create(@Body() dto: CreateTrainingGroupDto) {
    return this.trainingGroupsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List training groups (ADMIN only)' })
  findAll() {
    return this.trainingGroupsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get training group details (ADMIN only)' })
  findOne(@Param('id') id: string) {
    return this.trainingGroupsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update training group metadata (ADMIN only)' })
  update(@Param('id') id: string, @Body() dto: UpdateTrainingGroupDto) {
    return this.trainingGroupsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a training group (ADMIN only)' })
  remove(@Param('id') id: string) {
    return this.trainingGroupsService.remove(id);
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Add group members in bulk (ADMIN only)' })
  addMembers(@Param('id') id: string, @Body() dto: TrainingGroupMemberBulkDto) {
    return this.trainingGroupsService.addMembers(id, dto);
  }

  @Delete(':id/members')
  @ApiOperation({ summary: 'Remove group members in bulk (ADMIN only)' })
  removeMembers(
    @Param('id') id: string,
    @Body() dto: TrainingGroupMemberBulkDto,
  ) {
    return this.trainingGroupsService.removeMembers(id, dto);
  }

  @Post(':id/schedules')
  @ApiOperation({ summary: 'Add a weekly schedule (ADMIN only)' })
  addSchedule(
    @Param('id') id: string,
    @Body() dto: CreateTrainingGroupScheduleDto,
  ) {
    return this.trainingGroupsService.addSchedule(id, dto);
  }

  @Patch(':id/schedules/:scheduleId')
  @ApiOperation({ summary: 'Update a weekly schedule (ADMIN only)' })
  updateSchedule(
    @Param('id') id: string,
    @Param('scheduleId') scheduleId: string,
    @Body() dto: UpdateTrainingGroupScheduleDto,
  ) {
    return this.trainingGroupsService.updateSchedule(id, scheduleId, dto);
  }

  @Delete(':id/schedules/:scheduleId')
  @ApiOperation({ summary: 'Delete a weekly schedule (ADMIN only)' })
  removeSchedule(
    @Param('id') id: string,
    @Param('scheduleId') scheduleId: string,
  ) {
    return this.trainingGroupsService.removeSchedule(id, scheduleId);
  }
}
