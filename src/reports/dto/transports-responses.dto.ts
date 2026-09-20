import { ApiProperty } from '@nestjs/swagger';

class TransportsPeriodDto {
  @ApiProperty()
  from: string;

  @ApiProperty()
  to: string;

  @ApiProperty({ example: 'Europe/Paris' })
  timezone: string;
}

class TransportsTotalsDto {
  @ApiProperty()
  bookings: number;

  @ApiProperty()
  confirmed: number;

  @ApiProperty()
  cancelled: number;

  @ApiProperty()
  uniqueUsers: number;

  @ApiProperty()
  uniqueOccurrences: number;
}

export class TransportsSummaryDto {
  @ApiProperty({ type: TransportsPeriodDto })
  period: TransportsPeriodDto;

  @ApiProperty({ type: TransportsTotalsDto })
  totals: TransportsTotalsDto;
}

class TransportsBucketDto {
  @ApiProperty()
  date: string;

  @ApiProperty()
  total: number;

  @ApiProperty()
  confirmed: number;

  @ApiProperty()
  cancelled: number;
}

export class TransportsTimeseriesDto {
  @ApiProperty({ type: [TransportsBucketDto] })
  buckets: TransportsBucketDto[];
}

class TransportsListUserDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  firstname: string;

  @ApiProperty()
  lastname: string;
}

export class TransportsItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  departureAt: string;

  @ApiProperty({
    nullable: true,
    type: Object,
    example: {
      id: 'uuid',
      name: 'Morning Shuttle',
      fromLabel: 'A',
      toLabel: 'B',
    },
  })
  template: {
    id: string;
    name: string;
    fromLabel: string;
    toLabel: string;
  } | null;

  @ApiProperty({ type: TransportsListUserDto })
  user: TransportsListUserDto;

  @ApiProperty({ enum: ['CONFIRMED', 'CANCELLED'] })
  status: 'CONFIRMED' | 'CANCELLED';

  @ApiProperty()
  seats: number;
}

export class TransportsListDto {
  @ApiProperty({ type: [TransportsItemDto] })
  items: TransportsItemDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  pageSize: number;
}
