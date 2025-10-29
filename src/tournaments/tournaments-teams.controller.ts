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
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { TournamentsTeamsService } from './tournaments-teams.service';
import {
  GenerateTeamsDto,
  MoveParticipantDto,
  SwapParticipantsDto,
  ReorderTeamsRequestDto,
  SetTeamLockDto,
  AddMemberDto,
  TeamsResponseDto,
} from './dto';
import { AdminGuard } from '../auth/guards/admin.guard';

@ApiTags('tournaments/teams')
@ApiBearerAuth()
@Controller('tournaments/:tournamentId/teams')
@UseGuards(AdminGuard)
export class TournamentsTeamsController {
  constructor(
    private readonly tournamentsTeamsService: TournamentsTeamsService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List teams with members (Admin only)',
    description: 'Returns teams ordered by orderIndex with their members',
  })
  @ApiQuery({
    name: 'includeBench',
    required: false,
    type: Boolean,
    description: 'Include unassigned participants (bench)',
  })
  @ApiResponse({
    status: 200,
    description: 'Teams and bench participants',
    type: TeamsResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Tournament not found' })
  async listTeams(
    @Param('tournamentId') tournamentId: string,
    @Query('includeBench') includeBench?: string,
  ): Promise<TeamsResponseDto> {
    const includeBenchBool = includeBench === 'true';
    return this.tournamentsTeamsService.listTeams(
      tournamentId,
      includeBenchBool,
    );
  }

  @Post('generate')
  @ApiOperation({
    summary: 'Generate balanced teams (Admin only)',
    description:
      'Generate teams using BALANCED or RANDOM method. Can preserve locked teams.',
  })
  @ApiResponse({
    status: 201,
    description: 'Teams generated successfully',
    type: TeamsResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid parameters or insufficient participants',
  })
  @ApiResponse({ status: 404, description: 'Tournament not found' })
  async generateTeams(
    @Param('tournamentId') tournamentId: string,
    @Body() dto: GenerateTeamsDto,
  ): Promise<TeamsResponseDto> {
    return this.tournamentsTeamsService.generateTeams(tournamentId, dto);
  }

  @Post('rebalance')
  @ApiOperation({
    summary: 'Rebalance teams (Admin only)',
    description:
      'Regenerate teams while preserving locked teams. Forces preserveLocked=true.',
  })
  @ApiResponse({
    status: 201,
    description: 'Teams rebalanced successfully',
    type: TeamsResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid parameters' })
  @ApiResponse({ status: 404, description: 'Tournament not found' })
  async rebalanceTeams(
    @Param('tournamentId') tournamentId: string,
    @Body() dto: GenerateTeamsDto,
  ): Promise<TeamsResponseDto> {
    return this.tournamentsTeamsService.rebalanceTeams(tournamentId, dto);
  }

  @Patch('move')
  @ApiOperation({
    summary: 'Move participant to another team (Admin only)',
    description:
      'Move a participant to a different team or to bench (targetTeamId=null)',
  })
  @ApiResponse({
    status: 200,
    description: 'Participant moved successfully',
    type: TeamsResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Team locked, full, or other validation error',
  })
  @ApiResponse({ status: 404, description: 'Participant or team not found' })
  async moveParticipant(
    @Param('tournamentId') tournamentId: string,
    @Body() dto: MoveParticipantDto,
  ): Promise<TeamsResponseDto> {
    return this.tournamentsTeamsService.moveParticipant(tournamentId, dto);
  }

  @Patch('swap')
  @ApiOperation({
    summary: 'Swap two participants (Admin only)',
    description:
      'Exchange positions of two participants. One can be on bench.',
  })
  @ApiResponse({
    status: 200,
    description: 'Participants swapped successfully',
    type: TeamsResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Team locked or validation error' })
  @ApiResponse({ status: 404, description: 'Participant not found' })
  async swapParticipants(
    @Param('tournamentId') tournamentId: string,
    @Body() dto: SwapParticipantsDto,
  ): Promise<TeamsResponseDto> {
    return this.tournamentsTeamsService.swapParticipants(tournamentId, dto);
  }

  @Patch('reorder')
  @ApiOperation({
    summary: 'Reorder teams manually (Admin only)',
    description: 'Update order indices for teams',
  })
  @ApiResponse({
    status: 200,
    description: 'Teams reordered successfully',
    type: TeamsResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid team IDs' })
  @ApiResponse({ status: 404, description: 'Tournament not found' })
  async reorderTeams(
    @Param('tournamentId') tournamentId: string,
    @Body() dto: ReorderTeamsRequestDto,
  ): Promise<TeamsResponseDto> {
    return this.tournamentsTeamsService.reorderTeams(tournamentId, dto);
  }

  @Patch(':teamId/lock')
  @ApiOperation({
    summary: 'Lock or unlock a team (Admin only)',
    description:
      'Locked teams are preserved during regeneration and cannot be modified',
  })
  @ApiResponse({ status: 200, description: 'Team lock status updated' })
  @ApiResponse({ status: 404, description: 'Team not found' })
  @HttpCode(200)
  async setTeamLock(
    @Param('tournamentId') tournamentId: string,
    @Param('teamId') teamId: string,
    @Body() dto: SetTeamLockDto,
  ): Promise<{ message: string }> {
    await this.tournamentsTeamsService.setTeamLock(
      tournamentId,
      teamId,
      dto.locked,
    );
    return { message: `Team ${dto.locked ? 'locked' : 'unlocked'} successfully` };
  }

  @Delete()
  @ApiOperation({
    summary: 'Clear non-locked teams (Admin only)',
    description: 'Delete all non-locked teams and their members',
  })
  @ApiQuery({
    name: 'preserveLocked',
    required: false,
    type: Boolean,
    description: 'Preserve locked teams (default: true)',
  })
  @ApiResponse({ status: 204, description: 'Teams cleared successfully' })
  @ApiResponse({ status: 404, description: 'Tournament not found' })
  @HttpCode(204)
  async clearTeams(
    @Param('tournamentId') tournamentId: string,
    @Query('preserveLocked') preserveLocked?: string,
  ): Promise<void> {
    const preserveLockedBool = preserveLocked !== 'false';
    await this.tournamentsTeamsService.clearTeams(
      tournamentId,
      preserveLockedBool,
    );
  }

  @Post(':teamId/members')
  @ApiOperation({
    summary: 'Add member to team (Admin only)',
    description: 'Add a participant to a team. Team must not be locked or full.',
  })
  @ApiResponse({
    status: 201,
    description: 'Member added successfully',
    type: TeamsResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Team locked, full, or validation error',
  })
  @ApiResponse({ status: 404, description: 'Team or participant not found' })
  async addMember(
    @Param('tournamentId') tournamentId: string,
    @Param('teamId') teamId: string,
    @Body() dto: AddMemberDto,
  ): Promise<TeamsResponseDto> {
    return this.tournamentsTeamsService.addMember(
      tournamentId,
      teamId,
      dto.participantId,
    );
  }

  @Delete(':teamId/members/:memberId')
  @ApiOperation({
    summary: 'Remove member from team (Admin only)',
    description: 'Remove a member from a team. Team must not be locked.',
  })
  @ApiResponse({
    status: 200,
    description: 'Member removed successfully',
    type: TeamsResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Team locked' })
  @ApiResponse({ status: 404, description: 'Team or member not found' })
  async removeMember(
    @Param('tournamentId') tournamentId: string,
    @Param('teamId') teamId: string,
    @Param('memberId') memberId: string,
  ): Promise<TeamsResponseDto> {
    return this.tournamentsTeamsService.removeMember(
      tournamentId,
      teamId,
      memberId,
    );
  }
}
