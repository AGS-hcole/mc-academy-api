import { ApiProperty } from '@nestjs/swagger';

export class PeriodDto {
  @ApiProperty({ description: 'Start date of the period' })
  from: string;

  @ApiProperty({ description: 'End date of the period' })
  to: string;

  @ApiProperty({
    description: 'Timezone used for bucketing',
    example: 'Europe/Paris',
  })
  timezone: string;
}

export class TotalsDto {
  @ApiProperty({ description: 'Total number of sessions' })
  sessions: number;

  @ApiProperty({ description: 'Number of sessions under contract' })
  underContract: number;

  @ApiProperty({ description: 'Number of sessions off contract' })
  offContract: number;

  @ApiProperty({ description: 'Number of unique users with attendance' })
  uniqueUsers: number;
}

export class SessionsSummaryDto {
  @ApiProperty({ description: 'Period information', type: PeriodDto })
  period: PeriodDto;

  @ApiProperty({ description: 'Summary totals', type: TotalsDto })
  totals: TotalsDto;
}

export class BucketDto {
  @ApiProperty({ description: 'Date of the bucket (YYYY-MM-DD format)' })
  date: string;

  @ApiProperty({ description: 'Total sessions in this bucket' })
  total: number;

  @ApiProperty({ description: 'Sessions under contract in this bucket' })
  underContract: number;

  @ApiProperty({ description: 'Sessions off contract in this bucket' })
  offContract: number;
}

export class SessionsTimeseriesDto {
  @ApiProperty({ description: 'Time series buckets', type: [BucketDto] })
  buckets: BucketDto[];
}

export class SessionItemDto {
  @ApiProperty({ description: 'Session ID' })
  id: string;

  @ApiProperty({ description: 'Session date (ISO string)' })
  date: string;

  @ApiProperty({ description: 'Session title/description', required: false })
  title?: string;

  @ApiProperty({ description: 'Coach name', required: false })
  coachName?: string;

  @ApiProperty({ description: 'Contract type', enum: ['UNDER', 'OFF'] })
  contractType: string;

  @ApiProperty({ description: 'Number of attendees' })
  attendeesCount: number;

  @ApiProperty({ description: 'Session status', required: false })
  status?: string;
}

export class SessionsListDto {
  @ApiProperty({ description: 'List of sessions', type: [SessionItemDto] })
  items: SessionItemDto[];

  @ApiProperty({ description: 'Total number of sessions' })
  total: number;

  @ApiProperty({ description: 'Current page number' })
  page: number;

  @ApiProperty({ description: 'Page size' })
  pageSize: number;
}
