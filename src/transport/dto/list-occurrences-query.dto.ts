import { IsDateString, IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TransportOccurrenceStatus } from '@prisma/client';

export class ListOccurrencesQueryDto {
  @ApiProperty({
    description: 'Start date filter (YYYY-MM-DD)',
    example: '2026-01-15',
  })
  @IsDateString()
  from: string;

  @ApiProperty({
    description: 'End date filter (YYYY-MM-DD)',
    example: '2026-02-15',
  })
  @IsDateString()
  to: string;

  @ApiPropertyOptional({ description: 'Filter by template ID' })
  @IsOptional()
  @IsString()
  templateId?: string;

  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: TransportOccurrenceStatus,
  })
  @IsOptional()
  @IsEnum(TransportOccurrenceStatus)
  status?: TransportOccurrenceStatus;
}
