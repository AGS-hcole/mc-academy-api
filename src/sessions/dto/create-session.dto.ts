import {
  IsString,
  IsDateString,
  IsEnum,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { SessionSlot } from '@prisma/client';

export class CreateSessionDto {
  @IsString()
  siteId: string;

  @IsDateString()
  date: string;

  @IsEnum(SessionSlot)
  slot: SessionSlot;

  @IsOptional()
  @IsDateString()
  startTime?: string;

  @IsOptional()
  @IsDateString()
  endTime?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
