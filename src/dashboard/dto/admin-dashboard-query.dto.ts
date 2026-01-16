import { IsOptional, IsString, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AdminDashboardQueryDto {
  @ApiPropertyOptional({
    description:
      'Date in YYYY-MM-DD format (Europe/Paris timezone). If omitted, uses today.',
    example: '2026-01-16',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date must be in YYYY-MM-DD format',
  })
  date?: string;
}
