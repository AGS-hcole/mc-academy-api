import { IsISO8601, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ParentDashboardQueryDto {
  @ApiPropertyOptional({
    description:
      'Start date of the period (ISO 8601). Defaults to the first day of the current month (Europe/Paris).',
    example: '2026-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({
    description:
      'End date of the period (ISO 8601). Defaults to now. Used as the boundary between "past" and "upcoming" items.',
    example: '2026-01-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsISO8601()
  to?: string;
}
