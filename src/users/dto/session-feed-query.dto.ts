import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class SessionFeedQueryDto {
  @ApiPropertyOptional({
    description: 'Cursor based on last sessionId loaded',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({
    description: 'Page size (max 50)',
    default: 10,
    minimum: 1,
    maximum: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;

  @ApiPropertyOptional({
    enum: ['past', 'all'],
    default: 'past',
    description: 'Filter past sessions (default) or all sessions',
  })
  @IsOptional()
  @IsIn(['past', 'all'])
  direction?: 'past' | 'all';
}
