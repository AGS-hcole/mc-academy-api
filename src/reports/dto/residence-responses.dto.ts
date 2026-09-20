import { ApiProperty } from '@nestjs/swagger';

export class ResidencePeriodDto {
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

export class ResidenceTotalsDto {
  @ApiProperty({ description: 'Total number of nights stayed' })
  nights: number;

  @ApiProperty({ description: 'Number of unique users with a stay' })
  uniqueUsers: number;

  @ApiProperty({ description: 'Number of distinct manors used' })
  manorsUsed: number;

  @ApiProperty({ description: 'Number of stays flagged as over capacity' })
  overCapacityCount: number;
}

export class ResidenceSummaryDto {
  @ApiProperty({ description: 'Period information', type: ResidencePeriodDto })
  period: ResidencePeriodDto;

  @ApiProperty({ description: 'Summary totals', type: ResidenceTotalsDto })
  totals: ResidenceTotalsDto;
}

export class ResidenceBucketDto {
  @ApiProperty({ description: 'Date of the bucket (YYYY-MM-DD format)' })
  date: string;

  @ApiProperty({ description: 'Number of nights stayed in this bucket' })
  nights: number;
}

export class ResidenceTimeseriesDto {
  @ApiProperty({
    description: 'Time series buckets',
    type: [ResidenceBucketDto],
  })
  buckets: ResidenceBucketDto[];
}

export class ResidenceManorBriefDto {
  @ApiProperty({ description: 'Manor ID' })
  id: string;

  @ApiProperty({ description: 'Manor name' })
  name: string;
}

export class ResidenceUserBriefDto {
  @ApiProperty({ description: 'User ID' })
  id: string;

  @ApiProperty({ description: 'User first name' })
  firstname: string;

  @ApiProperty({ description: 'User last name' })
  lastname: string;
}

export class ResidenceStayItemDto {
  @ApiProperty({ description: 'Residence stay ID' })
  id: string;

  @ApiProperty({ description: 'Stay date (ISO string)' })
  date: string;

  @ApiProperty({
    description: 'Manor information',
    type: ResidenceManorBriefDto,
  })
  manor: ResidenceManorBriefDto;

  @ApiProperty({ description: 'User information', type: ResidenceUserBriefDto })
  user: ResidenceUserBriefDto;

  @ApiProperty({ description: 'Stay status', enum: ['PLANNED', 'CANCELED'] })
  status: string;

  @ApiProperty({ description: 'Whether the stay was over manor capacity' })
  overCapacity: boolean;

  @ApiProperty({ description: 'Whether the stay was created by an admin' })
  createdByAdmin: boolean;
}

export class ResidenceListDto {
  @ApiProperty({ description: 'List of stays', type: [ResidenceStayItemDto] })
  items: ResidenceStayItemDto[];

  @ApiProperty({ description: 'Total number of stays' })
  total: number;

  @ApiProperty({ description: 'Current page number' })
  page: number;

  @ApiProperty({ description: 'Page size' })
  pageSize: number;
}
