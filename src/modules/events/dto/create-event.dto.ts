import {
  IsString,
  IsOptional,
  IsDateString,
  IsUrl,
  IsBoolean,
  IsInt,
  MinLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateEventDto {
  @ApiProperty({ description: 'Event name', example: 'Adults Training Camp' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiPropertyOptional({
    description: 'Event description',
    example: 'Intensive training camp for adults',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Event start time (ISO8601)',
    example: '2025-11-01T08:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  startTime?: string;

  @ApiPropertyOptional({
    description: 'Event end time (ISO8601)',
    example: '2025-11-01T16:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  @ValidateIf(o => o.startTime && o.endTime)
  endTime?: string;

  @ApiPropertyOptional({
    description: 'Background image URL',
    example: 'https://cdn.example.com/mca/camps/adults.jpg',
  })
  @IsOptional()
  @IsUrl()
  backgroundImageUrl?: string;

  @ApiPropertyOptional({
    description: 'External registration URL (e.g., Google Form)',
    example: 'https://forms.gle/xxxx',
  })
  @IsOptional()
  @IsUrl()
  externalRegistrationUrl?: string;

  @ApiPropertyOptional({
    description: 'Whether the event is published',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === true || value === 'true')
  isPublished?: boolean;

  @ApiPropertyOptional({
    description: 'Display order index',
    default: 0,
    example: 10,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  orderIndex?: number;

  @ApiPropertyOptional({
    description: 'URL slug (generated from name if not provided)',
    example: 'adults-training-camp',
  })
  @IsOptional()
  @IsString()
  slug?: string;
}
