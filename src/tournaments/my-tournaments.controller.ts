import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TournamentsService } from './tournaments.service';
import { TournamentRsvpDto, TournamentFeedbackDto } from './dto';
import { AuthGuard } from '../auth/guards/auth.guards';

@ApiTags('v1/my/tournaments')
@ApiBearerAuth()
@Controller('v1')
@UseGuards(AuthGuard)
export class MyTournamentsController {
  constructor(private readonly tournamentsService: TournamentsService) {}

  @Get('my/tournaments')
  @ApiOperation({ summary: 'Get my tournaments' })
  @ApiQuery({
    name: 'scope',
    required: false,
    enum: ['upcoming', 'past', 'all'],
    description: 'Filter by scope (default: all)',
  })
  @ApiResponse({ status: 200, description: 'List of user tournaments' })
  async getMyTournaments(
    @Req() req: any,
    @Query('scope') scope?: 'upcoming' | 'past' | 'all',
  ) {
    return this.tournamentsService.findMyTournaments(
      req.user.id,
      scope || 'all',
    );
  }

  @Put('tournaments/:id/rsvp')
  @ApiOperation({
    summary: 'RSVP to tournament',
    description: 'Confirm or decline participation',
  })
  @ApiResponse({ status: 200, description: 'RSVP updated successfully' })
  @ApiResponse({ status: 404, description: 'Participant not found' })
  async rsvp(
    @Req() req: any,
    @Param('id') id: string,
    @Body() rsvpDto: TournamentRsvpDto,
  ) {
    return this.tournamentsService.rsvp(id, req.user.id, rsvpDto.status);
  }

  @Put('tournaments/:id/feedback')
  @ApiOperation({
    summary: 'Submit feedback for tournament',
    description: 'Submit feedback about tournament participation',
  })
  @ApiResponse({ status: 200, description: 'Feedback submitted successfully' })
  @ApiResponse({ status: 404, description: 'Participant not found' })
  async submitFeedback(
    @Req() req: any,
    @Param('id') id: string,
    @Body() feedbackDto: TournamentFeedbackDto,
  ) {
    return this.tournamentsService.submitFeedback(
      id,
      req.user.id,
      feedbackDto.feedback,
    );
  }
}
