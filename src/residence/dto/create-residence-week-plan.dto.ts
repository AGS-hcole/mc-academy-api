import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateResidenceWeekPlanDto {
  @ApiPropertyOptional({
    description: 'Student ID (admin only, if not provided uses current user)',
  })
  @IsOptional()
  @IsString()
  studentId?: string;

  @ApiPropertyOptional({
    description:
      'Week start date (Monday, YYYY-MM-DD). If not provided, uses next week.',
  })
  @IsOptional()
  @IsDateString()
  weekStartDate?: string;

  @ApiProperty({
    description:
      'Array of night dates (YYYY-MM-DD) the student plans to sleep at the manor',
    type: [String],
    example: ['2025-11-17', '2025-11-18', '2025-11-19'],
  })
  @IsArray()
  @IsDateString({}, { each: true })
  nights: string[];
}
