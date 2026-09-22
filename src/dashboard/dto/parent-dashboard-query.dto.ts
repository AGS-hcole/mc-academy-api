import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, Matches } from 'class-validator';

export class ParentDashboardQueryDto {
  @ApiPropertyOptional({
    description:
      'Start date (inclusive) in YYYY-MM-DD (Europe/Paris). Recommended format.',
    example: '2026-09-01',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'startDate must be in YYYY-MM-DD format',
  })
  startDate?: string;

  @ApiPropertyOptional({
    description:
      'End date (inclusive) in YYYY-MM-DD (Europe/Paris). Recommended format.',
    example: '2026-09-30',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'endDate must be in YYYY-MM-DD format',
  })
  endDate?: string;

  @ApiPropertyOptional({
    description:
      'Legacy start datetime (ISO). Supported for backward compatibility.',
    example: '2026-09-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    description:
      'Legacy end datetime (ISO). Supported for backward compatibility.',
    example: '2026-09-30T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString()
  to?: string;
}
