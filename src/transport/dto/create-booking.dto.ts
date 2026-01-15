import { IsInt, IsOptional, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBookingDto {
  @ApiPropertyOptional({
    description: 'Number of seats to book',
    default: 1,
    minimum: 1,
    maximum: 10,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  seats?: number = 1;
}
