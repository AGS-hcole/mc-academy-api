import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TournamentsService } from './tournaments.service';
import {
  CreateTournamentDto,
  UpdateTournamentDto,
  ReplaceParticipantsDto,
  ReorderTeamsDto,
  UpdatePlacementDto,
} from './dto';
import { AdminGuard } from '../auth/guards/admin.guard';
import { TournamentStatus, TournamentType } from '@prisma/client';

@ApiTags('tournaments')
@ApiBearerAuth()
@Controller('tournaments')
@UseGuards(AdminGuard)
export class TournamentsController {
  constructor(private readonly tournamentsService: TournamentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new tournament (Admin only)' })
  @ApiResponse({ status: 201, description: 'Tournament created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  async create(@Body() createTournamentDto: CreateTournamentDto) {
    return this.tournamentsService.create(createTournamentDto);
  }

  @Get()
  @ApiOperation({ summary: 'List all tournaments with filters (Admin only)' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: TournamentStatus,
    description: 'Filter by status',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: TournamentType,
    description: 'Filter by type',
  })
  @ApiQuery({
    name: 'from',
    required: false,
    description: 'Filter by start date (ISO string)',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    description: 'Filter by end date (ISO string)',
  })
  @ApiQuery({
    name: 'q',
    required: false,
    description: 'Search query (title, city, country)',
  })
  @ApiResponse({ status: 200, description: 'List of tournaments' })
  async findAll(
    @Query('status') status?: TournamentStatus,
    @Query('type') type?: TournamentType,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('q') q?: string,
  ) {
    return this.tournamentsService.findAll({
      status,
      type,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      q,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get tournament details (Admin only)' })
  @ApiResponse({ status: 200, description: 'Tournament details' })
  @ApiResponse({ status: 404, description: 'Tournament not found' })
  async findOne(@Param('id') id: string) {
    return this.tournamentsService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update tournament (Admin only)' })
  @ApiResponse({ status: 200, description: 'Tournament updated successfully' })
  @ApiResponse({ status: 404, description: 'Tournament not found' })
  async update(
    @Param('id') id: string,
    @Body() updateTournamentDto: UpdateTournamentDto,
  ) {
    return this.tournamentsService.update(id, updateTournamentDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete tournament (DRAFT only, Admin only)' })
  @ApiResponse({ status: 200, description: 'Tournament deleted successfully' })
  @ApiResponse({
    status: 400,
    description: 'Can only delete DRAFT tournaments',
  })
  @ApiResponse({ status: 404, description: 'Tournament not found' })
  async delete(@Param('id') id: string) {
    return this.tournamentsService.delete(id);
  }

  @Put(':id/publish')
  @ApiOperation({ summary: 'Publish tournament (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Tournament published successfully',
  })
  @ApiResponse({
    status: 400,
    description:
      'Cannot publish without at least 2 participants and valid teams',
  })
  @ApiResponse({ status: 404, description: 'Tournament not found' })
  async publish(@Param('id') id: string) {
    return this.tournamentsService.publish(id);
  }

  @Put(':id/archive')
  @ApiOperation({ summary: 'Archive tournament (Admin only)' })
  @ApiResponse({ status: 200, description: 'Tournament archived successfully' })
  @ApiResponse({ status: 404, description: 'Tournament not found' })
  async archive(@Param('id') id: string) {
    return this.tournamentsService.archive(id);
  }

  @Put(':id/participants')
  @ApiOperation({
    summary: 'Replace tournament participants (Admin only)',
    description:
      'Replace participant list with array of userIds. Clears existing teams.',
  })
  @ApiResponse({
    status: 200,
    description: 'Participants replaced successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid user IDs' })
  @ApiResponse({ status: 404, description: 'Tournament not found' })
  async replaceParticipants(
    @Param('id') id: string,
    @Body() replaceParticipantsDto: ReplaceParticipantsDto,
  ) {
    return this.tournamentsService.replaceParticipants(
      id,
      replaceParticipantsDto,
    );
  }

  @Post(':id/generate-teams')
  @ApiOperation({
    summary: 'Auto-generate homogeneous teams (Admin only)',
    description:
      'Generate pairs based on current ranking. Sorts by ranking descending and pairs adjacent players (1-2, 3-4, etc.)',
  })
  @ApiResponse({ status: 201, description: 'Teams generated successfully' })
  @ApiResponse({
    status: 400,
    description: 'Cannot generate teams with less than 2 participants',
  })
  @ApiResponse({ status: 404, description: 'Tournament not found' })
  async generateTeams(@Param('id') id: string) {
    return this.tournamentsService.generateTeams(id);
  }

  @Put(':id/reorder-teams')
  @ApiOperation({
    summary: 'Reorder teams manually (Admin only)',
    description: 'Provide array of team IDs in desired order',
  })
  @ApiResponse({ status: 200, description: 'Teams reordered successfully' })
  @ApiResponse({ status: 400, description: 'Invalid team IDs or order' })
  @ApiResponse({ status: 404, description: 'Tournament not found' })
  async reorderTeams(
    @Param('id') id: string,
    @Body() reorderTeamsDto: ReorderTeamsDto,
  ) {
    return this.tournamentsService.reorderTeams(id, reorderTeamsDto);
  }

  @Put(':id/teams/:teamId/placement')
  @ApiOperation({
    summary: 'Update team placement (Admin only)',
    description: 'Set final placement for a team (1st, 2nd, 3rd, etc.)',
  })
  @ApiResponse({ status: 200, description: 'Placement updated successfully' })
  @ApiResponse({ status: 404, description: 'Team not found' })
  async updatePlacement(
    @Param('id') tournamentId: string,
    @Param('teamId') teamId: string,
    @Body() updatePlacementDto: UpdatePlacementDto,
  ) {
    return this.tournamentsService.updateTeamPlacement(
      tournamentId,
      teamId,
      updatePlacementDto,
    );
  }
}
