import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsInt,
  Min,
} from 'class-validator';

export class GenerateTeamsDto {
  @ApiProperty({
    enum: ['BALANCED', 'RANDOM'],
    default: 'BALANCED',
    required: false,
    description: 'Team generation method',
  })
  @IsEnum(['BALANCED', 'RANDOM'])
  @IsOptional()
  method?: 'BALANCED' | 'RANDOM';

  @ApiProperty({
    default: true,
    required: false,
    description: 'Keep locked teams unchanged during generation',
  })
  @IsBoolean()
  @IsOptional()
  preserveLocked?: boolean;

  @ApiProperty({
    default: true,
    required: false,
    description: 'Clear existing non-locked teams before generation',
  })
  @IsBoolean()
  @IsOptional()
  clearExisting?: boolean;

  @ApiProperty({
    required: false,
    description: 'Random seed for reproducible RANDOM generation',
  })
  @IsNumber()
  @IsOptional()
  randomSeed?: number;

  @ApiProperty({
    default: 2,
    required: false,
    description: 'Number of participants per team (pairs)',
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  teamSize?: number;

  @ApiProperty({
    default: true,
    required: false,
    description: 'Allow odd participant to be placed on bench',
  })
  @IsBoolean()
  @IsOptional()
  allowOddParticipant?: boolean;

  @ApiProperty({
    default: true,
    required: false,
    description: 'Snapshot current ranking to participant.rankSnapshot',
  })
  @IsBoolean()
  @IsOptional()
  snapshotRanking?: boolean;
}
