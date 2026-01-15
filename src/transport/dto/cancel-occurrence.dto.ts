import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CancelOccurrenceDto {
  @ApiPropertyOptional({
    description: 'Reason for cancellation',
    example: 'Bad weather conditions',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
