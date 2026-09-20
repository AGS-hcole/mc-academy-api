import { ApiProperty } from '@nestjs/swagger';

export class TransportsPeriodDto {
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

export class TransportsTotalsDto {
  @ApiProperty({ description: 'Total number of bookings matching the filter' })
  bookings: number;

  @ApiProperty({ description: 'Number of confirmed bookings' })
  confirmedBookings: number;

  @ApiProperty({ description: 'Number of cancelled bookings' })
  cancelledBookings: number;

  @ApiProperty({ description: 'Number of unique users with a booking' })
  uniqueUsers: number;

  @ApiProperty({ description: 'Number of distinct transport occurrences used' })
  occurrencesUsed: number;

  @ApiProperty({ description: 'Total number of seats booked (confirmed only)' })
  seatsBooked: number;
}

export class TransportsSummaryDto {
  @ApiProperty({ description: 'Period information', type: TransportsPeriodDto })
  period: TransportsPeriodDto;

  @ApiProperty({ description: 'Summary totals', type: TransportsTotalsDto })
  totals: TransportsTotalsDto;
}

export class TransportsBucketDto {
  @ApiProperty({ description: 'Date of the bucket (YYYY-MM-DD format)' })
  date: string;

  @ApiProperty({ description: 'Total bookings in this bucket' })
  total: number;

  @ApiProperty({ description: 'Confirmed bookings in this bucket' })
  confirmed: number;

  @ApiProperty({ description: 'Cancelled bookings in this bucket' })
  cancelled: number;
}

export class TransportsTimeseriesDto {
  @ApiProperty({
    description: 'Time series buckets',
    type: [TransportsBucketDto],
  })
  buckets: TransportsBucketDto[];
}

export class TransportTemplateBriefDto {
  @ApiProperty({ description: 'Transport template ID' })
  id: string;

  @ApiProperty({ description: 'Transport template name' })
  name: string;

  @ApiProperty({ description: 'Origin label' })
  fromLabel: string;

  @ApiProperty({ description: 'Destination label' })
  toLabel: string;
}

export class TransportUserBriefDto {
  @ApiProperty({ description: 'User ID' })
  id: string;

  @ApiProperty({ description: 'User first name' })
  firstname: string;

  @ApiProperty({ description: 'User last name' })
  lastname: string;
}

export class TransportBookingItemDto {
  @ApiProperty({ description: 'Booking ID' })
  id: string;

  @ApiProperty({ description: 'Occurrence departure date/time (ISO string)' })
  departureAt: string;

  @ApiProperty({
    description: 'Transport template information',
    type: TransportTemplateBriefDto,
  })
  template: TransportTemplateBriefDto;

  @ApiProperty({ description: 'User information', type: TransportUserBriefDto })
  user: TransportUserBriefDto;

  @ApiProperty({ description: 'Number of seats booked' })
  seats: number;

  @ApiProperty({
    description: 'Booking status',
    enum: ['CONFIRMED', 'CANCELLED'],
  })
  status: string;
}

export class TransportsListDto {
  @ApiProperty({
    description: 'List of bookings',
    type: [TransportBookingItemDto],
  })
  items: TransportBookingItemDto[];

  @ApiProperty({ description: 'Total number of bookings' })
  total: number;

  @ApiProperty({ description: 'Current page number' })
  page: number;

  @ApiProperty({ description: 'Page size' })
  pageSize: number;
}
