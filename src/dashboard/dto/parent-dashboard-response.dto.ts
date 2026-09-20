import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ParentDashboardPeriodDto {
  @ApiProperty({ description: 'Start of the period (ISO 8601, UTC)' })
  from: string;

  @ApiProperty({
    description:
      'End of the period (ISO 8601, UTC). Also used as the "now" boundary between past and upcoming items.',
  })
  to: string;

  @ApiProperty({ description: 'Timezone used to compute period defaults' })
  timezone: string;
}

export class ChildBriefDto {
  @ApiProperty({ description: 'Child user ID' })
  id: string;

  @ApiProperty({ description: 'Child first name' })
  firstname: string;

  @ApiProperty({ description: 'Child last name' })
  lastname: string;

  @ApiPropertyOptional({ description: 'Child birth date', nullable: true })
  birthDate: string | null;
}

export class ChildTrainingSessionsDto {
  @ApiProperty({
    description:
      'Number of past training sessions the child attended (attendance status YES, session not canceled, session date within the period and in the past)',
  })
  completedCount: number;
}

export class ChildRatingsDto {
  @ApiProperty({
    description:
      'Average score (0..10) received during past training sessions within the period, null if no rating',
    nullable: true,
  })
  average: number | null;

  @ApiProperty({
    description: 'Number of ratings used to compute the average',
  })
  count: number;
}

export class ChildTransportsDto {
  @ApiProperty({
    description:
      'Number of past confirmed transport bookings within the period (occurrence departure date in the past)',
  })
  completedCount: number;
}

export class ChildResidenceDto {
  @ApiProperty({
    description:
      'Number of past nights stayed (residence stays not canceled, date within the period and in the past)',
  })
  nightsCount: number;
}

export class ChildTournamentsDto {
  @ApiProperty({
    description:
      'Number of tournaments completed within the period (participation confirmed, tournament end date in the past)',
  })
  completedCount: number;

  @ApiProperty({
    description:
      'Number of upcoming tournaments the child is registered to (participation confirmed, tournament start date in the future, regardless of the "to" period bound)',
  })
  upcomingCount: number;
}

export class ChildDashboardDto {
  @ApiProperty({ description: 'Child user information', type: ChildBriefDto })
  child: ChildBriefDto;

  @ApiProperty({
    description: 'Training sessions statistics',
    type: ChildTrainingSessionsDto,
  })
  trainingSessions: ChildTrainingSessionsDto;

  @ApiProperty({ description: 'Ratings statistics', type: ChildRatingsDto })
  ratings: ChildRatingsDto;

  @ApiProperty({
    description: 'Transports statistics',
    type: ChildTransportsDto,
  })
  transports: ChildTransportsDto;

  @ApiProperty({
    description: 'Residence (overnight stays) statistics',
    type: ChildResidenceDto,
  })
  residence: ChildResidenceDto;

  @ApiProperty({
    description: 'Tournaments statistics',
    type: ChildTournamentsDto,
  })
  tournaments: ChildTournamentsDto;
}

export class ParentDashboardResponseDto {
  @ApiProperty({
    description: 'Period used to compute the statistics',
    type: ParentDashboardPeriodDto,
  })
  period: ParentDashboardPeriodDto;

  @ApiProperty({
    description: 'Dashboard data for each child linked to the connected parent',
    type: [ChildDashboardDto],
  })
  children: ChildDashboardDto[];
}
