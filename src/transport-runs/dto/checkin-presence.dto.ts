import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsString,
  IsEnum,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PresenceMark } from '@prisma/client';

export class PresenceEntryDto {
  @ApiProperty({
    description: 'Student ID',
  })
  @IsString()
  studentId: string;

  @ApiProperty({
    description: 'Presence mark',
    enum: PresenceMark,
  })
  @IsEnum(PresenceMark)
  mark: PresenceMark;

  @ApiProperty({
    description: 'Optional notes',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CheckinPresenceDto {
  @ApiProperty({
    description: 'Array of presence entries',
    type: [PresenceEntryDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PresenceEntryDto)
  presences: PresenceEntryDto[];
}
