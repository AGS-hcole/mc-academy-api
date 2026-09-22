import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Matches, Max, Min } from 'class-validator';

export class UpdateTrainingGroupScheduleDto {
  @ApiPropertyOptional({
    description: 'ISO weekday (1=Monday ... 7=Sunday)',
    minimum: 1,
    maximum: 7,
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(7)
  dayOfWeek?: number;

  @ApiPropertyOptional({
    description: 'Start time in HH:mm format',
    example: '09:00',
  })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'startTime must be in HH:mm format',
  })
  startTime?: string;

  @ApiPropertyOptional({
    description: 'End time in HH:mm format',
    example: '10:30',
  })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'endTime must be in HH:mm format',
  })
  endTime?: string;
}
