import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsDateString,
  IsArray,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TransportDirection } from '@prisma/client';

export class TransportPlanEntryDto {
  @ApiProperty({
    description: 'Transport template ID',
  })
  @IsString()
  templateId: string;

  @ApiProperty({
    description: 'Date for this transport (YYYY-MM-DD)',
    example: '2025-11-17',
  })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({
    description: 'Transport direction (optional, derived from template)',
    enum: TransportDirection,
  })
  @IsOptional()
  @IsEnum(TransportDirection)
  direction?: TransportDirection;
}

export class CreateTransportWeekPlanDto {
  @ApiPropertyOptional({
    description:
      'Student ID (admin only, if not provided uses current user)',
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
    description: 'Array of transport plan entries',
    type: [TransportPlanEntryDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransportPlanEntryDto)
  entries: TransportPlanEntryDto[];
}
