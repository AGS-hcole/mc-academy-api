import {
  IsOptional,
  IsInt,
  IsString,
  IsBoolean,
  IsDateString,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export enum SortOption {
  RECENT = 'recent',
  ORDER = 'order',
}

export class QueryEventsDto {
  @ApiPropertyOptional({
    description: 'Page number',
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value, 10))
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Page size',
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => parseInt(value, 10))
  pageSize?: number = 20;

  @ApiPropertyOptional({
    description: 'Search query (filters name and description)',
    example: 'training',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter to only active events (based on start/end time)',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === true || value === 'true')
  activeOnly?: boolean;

  @ApiPropertyOptional({
    description: 'Filter to only published events',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === true || value === 'true')
  publishedOnly?: boolean;

  @ApiPropertyOptional({
    description: 'Filter events starting from this date',
    example: '2025-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    description: 'Filter events ending before this date',
    example: '2025-12-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({
    description: 'Sort option',
    enum: SortOption,
    default: SortOption.ORDER,
  })
  @IsOptional()
  @IsEnum(SortOption)
  sort?: SortOption = SortOption.ORDER;
}
