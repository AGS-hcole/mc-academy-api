import { IsDateString, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GenerateOccurrencesDto {
  @ApiProperty({
    description: 'Start date (inclusive) in YYYY-MM-DD format',
    example: '2026-01-15',
  })
  @IsDateString()
  fromDate: string;

  @ApiProperty({
    description: 'End date (inclusive) in YYYY-MM-DD format',
    example: '2026-02-15',
  })
  @IsDateString()
  toDate: string;
}
