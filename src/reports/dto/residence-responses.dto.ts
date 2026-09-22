import { ApiProperty } from '@nestjs/swagger';

class ResidencePeriodDto {
  @ApiProperty()
  from: string;

  @ApiProperty()
  to: string;

  @ApiProperty({ example: 'Europe/Paris' })
  timezone: string;
}

class ResidenceTotalsDto {
  @ApiProperty()
  nights: number;

  @ApiProperty()
  planned: number;

  @ApiProperty()
  canceled: number;

  @ApiProperty()
  uniqueUsers: number;
}

export class ResidenceSummaryDto {
  @ApiProperty({ type: ResidencePeriodDto })
  period: ResidencePeriodDto;

  @ApiProperty({ type: ResidenceTotalsDto })
  totals: ResidenceTotalsDto;
}

class ResidenceBucketDto {
  @ApiProperty()
  date: string;

  @ApiProperty()
  total: number;

  @ApiProperty()
  planned: number;

  @ApiProperty()
  canceled: number;
}

export class ResidenceTimeseriesDto {
  @ApiProperty({ type: [ResidenceBucketDto] })
  buckets: ResidenceBucketDto[];
}

class ResidenceListUserDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  firstname: string;

  @ApiProperty()
  lastname: string;
}

export class ResidenceItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  date: string;

  @ApiProperty({
    nullable: true,
    type: Object,
    example: { id: 'uuid', name: 'Manor A' },
  })
  manor: { id: string; name: string } | null;

  @ApiProperty({ type: ResidenceListUserDto })
  user: ResidenceListUserDto;

  @ApiProperty({ enum: ['PLANNED', 'CANCELED'] })
  status: 'PLANNED' | 'CANCELED';

  @ApiProperty()
  overCapacity: boolean;

  @ApiProperty()
  createdByAdmin: boolean;
}

export class ResidenceListDto {
  @ApiProperty({ type: [ResidenceItemDto] })
  items: ResidenceItemDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  pageSize: number;
}
