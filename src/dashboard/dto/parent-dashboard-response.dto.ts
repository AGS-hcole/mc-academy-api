import { ApiProperty } from '@nestjs/swagger';

class ParentDashboardChildUserDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  firstname: string;

  @ApiProperty()
  lastname: string;

  @ApiProperty()
  email: string;
}

class ParentDashboardChildMetricsDto {
  @ApiProperty({
    description: 'Training sessions attended in period and already in the past',
  })
  trainingSessionsDone: number;

  @ApiProperty({
    description:
      'Average rating received on past sessions in period, null when no rating',
    nullable: true,
  })
  averageTrainingRating: number | null;

  @ApiProperty({
    description: 'Confirmed transports done in period and already in the past',
  })
  transportsDone: number;

  @ApiProperty({
    description: 'Residence nights done in period and already in the past',
  })
  residenceNightsDone: number;

  @ApiProperty({
    description: 'Confirmed tournaments already completed in the period',
  })
  tournamentsDone: number;

  @ApiProperty({
    description: 'Confirmed tournaments still upcoming in the period',
  })
  tournamentsUpcoming: number;
}

class ParentDashboardChildEntryDto {
  @ApiProperty({ type: ParentDashboardChildUserDto })
  child: ParentDashboardChildUserDto;

  @ApiProperty({ type: ParentDashboardChildMetricsDto })
  metrics: ParentDashboardChildMetricsDto;
}

class ParentDashboardPeriodDto {
  @ApiProperty()
  startDate: string;

  @ApiProperty()
  endDate: string;

  @ApiProperty({ example: 'Europe/Paris' })
  timezone: string;
}

export class ParentDashboardResponseDto {
  @ApiProperty({ type: ParentDashboardPeriodDto })
  period: ParentDashboardPeriodDto;

  @ApiProperty()
  generatedAt: string;

  @ApiProperty({ type: ParentDashboardChildEntryDto, isArray: true })
  children: ParentDashboardChildEntryDto[];
}
