import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ReportsService } from './reports.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  SessionsQueryDto,
  SessionsTimeseriesQueryDto,
  SessionsListQueryDto,
  SessionsSummaryDto,
  SessionsTimeseriesDto,
  SessionsListDto,
  RatingsQueryDto,
  RatingsSummaryDto,
  ResidenceQueryDto,
  ResidenceTimeseriesQueryDto,
  ResidenceListQueryDto,
  ResidenceSummaryDto,
  ResidenceTimeseriesDto,
  ResidenceListDto,
  TransportsQueryDto,
  TransportsTimeseriesQueryDto,
  TransportsListQueryDto,
  TransportsSummaryDto,
  TransportsTimeseriesDto,
  TransportsListDto,
} from './dto';

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports/sessions')
@UseGuards(RolesGuard)
@Roles(Role.admin, Role.parent)
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
@UseGuards(RolesGuard)
@Roles(Role.admin, Role.parent)
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

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports/residence')
@UseGuards(RolesGuard)
@Roles(Role.admin, Role.parent)
export class ResidenceReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get residence analytics summary' })
  @ApiResponse({
    status: 200,
    description: 'Returns summary statistics for residence stays in date range',
    type: ResidenceSummaryDto,
  })
  async getSummary(
    @Query() query: ResidenceQueryDto,
  ): Promise<ResidenceSummaryDto> {
    return this.reportsService.getResidenceSummary(query);
  }

  @Get('timeseries')
  @ApiOperation({ summary: 'Get residence analytics time series' })
  @ApiResponse({
    status: 200,
    description: 'Returns residence daily time series in date range',
    type: ResidenceTimeseriesDto,
  })
  async getTimeseries(
    @Query() query: ResidenceTimeseriesQueryDto,
  ): Promise<ResidenceTimeseriesDto> {
    return this.reportsService.getResidenceTimeseries(query);
  }

  @Get('list')
  @ApiOperation({ summary: 'Get paginated list of residence stays' })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated residence stays in date range',
    type: ResidenceListDto,
  })
  async getList(
    @Query() query: ResidenceListQueryDto,
  ): Promise<ResidenceListDto> {
    return this.reportsService.getResidenceList(query);
  }
}

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports/transports')
@UseGuards(RolesGuard)
@Roles(Role.admin, Role.parent)
export class TransportsReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get transport analytics summary' })
  @ApiResponse({
    status: 200,
    description:
      'Returns summary statistics for transport bookings in date range',
    type: TransportsSummaryDto,
  })
  async getSummary(
    @Query() query: TransportsQueryDto,
  ): Promise<TransportsSummaryDto> {
    return this.reportsService.getTransportsSummary(query);
  }

  @Get('timeseries')
  @ApiOperation({ summary: 'Get transport analytics time series' })
  @ApiResponse({
    status: 200,
    description: 'Returns transport daily time series in date range',
    type: TransportsTimeseriesDto,
  })
  async getTimeseries(
    @Query() query: TransportsTimeseriesQueryDto,
  ): Promise<TransportsTimeseriesDto> {
    return this.reportsService.getTransportsTimeseries(query);
  }

  @Get('list')
  @ApiOperation({ summary: 'Get paginated list of transport bookings' })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated transport bookings in date range',
    type: TransportsListDto,
  })
  async getList(
    @Query() query: TransportsListQueryDto,
  ): Promise<TransportsListDto> {
    return this.reportsService.getTransportsList(query);
  }
}
