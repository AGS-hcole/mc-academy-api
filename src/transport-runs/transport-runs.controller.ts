import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Query,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TransportRunsService } from './transport-runs.service';
import {
  GenerateRunsDto,
  AssignStudentDto,
  CheckinPresenceDto,
} from './dto';
import { AdminGuard } from '../auth/guards/admin.guard';

@ApiTags('Transport Runs')
@Controller('transport/runs')
@UseGuards(AdminGuard)
@ApiBearerAuth()
export class TransportRunsController {
  constructor(private readonly transportRunsService: TransportRunsService) {}

  @Post('generate')
  @ApiOperation({
    summary: 'Generate transport runs for a week',
    description:
      'Admin only: Generate transport runs for all templates based on student week plans.',
  })
  async generateRuns(@Body() dto: GenerateRunsDto) {
    return this.transportRunsService.generateRunsForWeek(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get transport runs within a date range',
    description:
      'Admin only: Retrieve transport runs with assignments and presences.',
  })
  async getRuns(@Query('from') from: string, @Query('to') to: string) {
    return this.transportRunsService.getRuns(from, to);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a transport run by ID',
    description: 'Admin only: Retrieve a single transport run with details.',
  })
  async getRunById(@Param('id') id: string) {
    return this.transportRunsService.getRunById(id);
  }

  @Post(':id/assign')
  @ApiOperation({
    summary: 'Assign a student to a run',
    description:
      'Admin only: Manually assign a student to a run or update assignment status.',
  })
  async assignStudent(
    @Param('id') id: string,
    @Body() dto: AssignStudentDto,
  ) {
    return this.transportRunsService.assignStudent(id, dto);
  }

  @Delete(':id/assign/:studentId')
  @ApiOperation({
    summary: 'Remove a student assignment from a run',
    description: 'Admin only: Remove a student from a transport run.',
  })
  async removeAssignment(
    @Param('id') id: string,
    @Param('studentId') studentId: string,
  ) {
    return this.transportRunsService.removeAssignment(id, studentId);
  }

  @Post(':id/checkin')
  @ApiOperation({
    summary: 'Check-in student presences for a run',
    description:
      'Admin only: Mark students as present, absent, or excused for a run.',
  })
  async checkinPresence(
    @Param('id') id: string,
    @Body() dto: CheckinPresenceDto,
  ) {
    return this.transportRunsService.checkinPresence(id, dto);
  }
}
