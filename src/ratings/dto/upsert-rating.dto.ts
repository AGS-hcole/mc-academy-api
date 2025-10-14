import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpsertRatingDto {
  @ApiProperty({
    description: 'Rating score from 0 to 10',
    minimum: 0,
    maximum: 10,
    example: 8,
  })
  @IsInt()
  @Min(0)
  @Max(10)
  score: number;

  @ApiProperty({
    description: 'Optional comment about the rating',
    maxLength: 2000,
    required: false,
    example: 'Great performance during the session',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
}
