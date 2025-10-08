import {
  IsString,
  IsDateString,
  IsEnum,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SessionSlot } from '@prisma/client';

export class CreateSessionDto {
  @ApiProperty({ description: 'Site ID where the session will take place' })
  @IsString()
  siteId: string;

  @ApiProperty({ description: 'Date of the session (ISO string)' })
  @IsDateString()
  date: string;

  @ApiProperty({ description: 'Session slot (AM or PM)', enum: SessionSlot })
  @IsEnum(SessionSlot)
  slot: SessionSlot;

  @ApiPropertyOptional({
    description: 'Specific start time for the session (ISO string)',
  })
  @IsOptional()
  @IsDateString()
  startTime?: string;

  @ApiPropertyOptional({
    description: 'Specific end time for the session (ISO string)',
  })
  @IsOptional()
  @IsDateString()
  endTime?: string;

  @ApiPropertyOptional({ description: 'Additional notes for the session' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Whether the session is published',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
