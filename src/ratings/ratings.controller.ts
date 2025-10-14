import {
  Controller,
  Get,
  Put,
  Delete,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { RatingsService } from './ratings.service';
import { UpsertRatingDto } from './dto';
import { AuthGuard } from '../auth/guards/auth.guards';
import { AdminGuard } from '../auth/guards/admin.guard';

@ApiTags('Ratings')
@Controller('ratings')
export class RatingsController {
  constructor(private readonly ratingsService: RatingsService) {}

  @Put('sessions/:sessionId/users/:userId')
  @UseGuards(AdminGuard)
  @ApiOperation({
    summary: 'Create or update a rating for a participant in a session',
    description: 'Admins can rate participants who are present at a session',
  })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiParam({ name: 'userId', description: 'User ID of the participant' })
  @ApiBody({ type: UpsertRatingDto })
  @ApiResponse({
    status: 200,
    description: 'Rating created or updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({
    status: 404,
    description: 'Session or user not found, or user not present at session',
  })
  async upsertRating(
    @Param('sessionId') sessionId: string,
    @Param('userId') userId: string,
    @Body() dto: UpsertRatingDto,
    @Req() req: any,
  ) {
    const raterId = req.user?.id ?? req.user?.sub;
    return this.ratingsService.upsertRating(sessionId, userId, raterId, dto);
  }

  @Get('sessions/:sessionId')
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: 'Get all ratings for a session',
    description: 'Returns all ratings with statistics for a specific session',
  })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({
    status: 200,
    description: 'Ratings and statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        ratings: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              sessionId: { type: 'string' },
              userId: { type: 'string' },
              raterId: { type: 'string' },
              score: { type: 'number' },
              comment: { type: 'string', nullable: true },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
              rater: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  firstName: { type: 'string' },
                  lastName: { type: 'string' },
                },
              },
            },
          },
        },
        stats: {
          type: 'object',
          properties: {
            average: { type: 'number', example: 7.4 },
            count: { type: 'number', example: 12 },
            distribution: {
              type: 'object',
              example: {
                '0': 0,
                '1': 0,
                '2': 1,
                '3': 0,
                '4': 1,
                '5': 2,
                '6': 3,
                '7': 2,
                '8': 1,
                '9': 1,
                '10': 1,
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async getSessionRatings(@Param('sessionId') sessionId: string) {
    return this.ratingsService.getSessionRatings(sessionId);
  }

  @Get('users/:userId')
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: 'Get ratings for a user',
    description:
      'Returns average and list of ratings for a specific user, optionally filtered by date range',
  })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiQuery({
    name: 'from',
    required: false,
    description: 'Start date (YYYY-MM-DD)',
    example: '2025-01-01',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    description: 'End date (YYYY-MM-DD)',
    example: '2025-12-31',
  })
  @ApiResponse({
    status: 200,
    description: 'User ratings retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        average: { type: 'number', example: 7.8 },
        count: { type: 'number', example: 15 },
        ratings: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              sessionId: { type: 'string' },
              userId: { type: 'string' },
              raterId: { type: 'string' },
              score: { type: 'number' },
              comment: { type: 'string', nullable: true },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
              rater: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  firstName: { type: 'string' },
                  lastName: { type: 'string' },
                },
              },
              session: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  date: { type: 'string', format: 'date-time' },
                  slot: { type: 'string', enum: ['AM', 'PM'] },
                  site: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserRatings(
    @Param('userId') userId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.ratingsService.getUserRatings(userId, from, to);
  }

  @Delete('sessions/:sessionId/users/:userId')
  @UseGuards(AdminGuard)
  @ApiOperation({
    summary: 'Delete a rating',
    description: 'Admins can delete a rating for a participant in a session',
  })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiParam({ name: 'userId', description: 'User ID of the participant' })
  @ApiResponse({ status: 200, description: 'Rating deleted successfully' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 404, description: 'Rating not found' })
  async deleteRating(
    @Param('sessionId') sessionId: string,
    @Param('userId') userId: string,
  ) {
    return this.ratingsService.deleteRating(sessionId, userId);
  }
}
