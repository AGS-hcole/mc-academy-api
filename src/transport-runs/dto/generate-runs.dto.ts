import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

export class GenerateRunsDto {
  @ApiProperty({
    description:
      'Week start date (Monday, YYYY-MM-DD) for which to generate runs',
    example: '2025-11-17',
  })
  @IsDateString()
  weekStart: string;
}
