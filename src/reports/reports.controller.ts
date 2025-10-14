import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { AdminGuard } from '../auth/guards/admin.guard';
import {
  SessionsQueryDto,
  SessionsTimeseriesQueryDto,
  SessionsListQueryDto,
  SessionsSummaryDto,
  SessionsTimeseriesDto,
  SessionsListDto,
  RatingsQueryDto,
  RatingsSummaryDto,
} from './dto';

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports/sessions')
@UseGuards(AdminGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get session analytics summary' })
  @ApiResponse({
    status: 200,
    description: 'Returns summary statistics for sessions in the date range',
    type: SessionsSummaryDto,
  })
  async getSummary(
    @Query() query: SessionsQueryDto,
  ): Promise<SessionsSummaryDto> {
    return this.reportsService.getSessionsSummary(query);
  }

  @Get('timeseries')
  @ApiOperation({ summary: 'Get session analytics time series' })
  @ApiResponse({
    status: 200,
    description: 'Returns time series data bucketed by day',
    type: SessionsTimeseriesDto,
  })
  async getTimeseries(
    @Query() query: SessionsTimeseriesQueryDto,
  ): Promise<SessionsTimeseriesDto> {
    return this.reportsService.getSessionsTimeseries(query);
  }

  @Get('list')
  @ApiOperation({ summary: 'Get paginated list of sessions' })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated list of sessions',
    type: SessionsListDto,
  })
  async getList(
    @Query() query: SessionsListQueryDto,
  ): Promise<SessionsListDto> {
    return this.reportsService.getSessionsList(query);
  }
}

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports/ratings')
@UseGuards(AdminGuard)
export class RatingsReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get ratings analytics summary' })
  @ApiResponse({
    status: 200,
    description:
      'Returns summary statistics for ratings in the date range, including global aggregates, per-user stats, top/bottom performers, and contract split',
    type: RatingsSummaryDto,
  })
  async getRatingsSummary(
    @Query() query: RatingsQueryDto,
  ): Promise<RatingsSummaryDto> {
    return this.reportsService.getRatingsSummary(query);
  }
}
