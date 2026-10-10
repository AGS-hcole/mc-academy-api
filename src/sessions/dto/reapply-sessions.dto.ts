import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, Matches } from 'class-validator';

export class ReapplySessionsDto {
  @ApiProperty({
    description: 'Inclusive start date (YYYY-MM-DD)',
    example: '2026-10-12',
  })
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  startDate: string;

  @ApiProperty({
    description: 'Inclusive end date (YYYY-MM-DD)',
    example: '2026-10-18',
  })
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  endDate: string;
}
