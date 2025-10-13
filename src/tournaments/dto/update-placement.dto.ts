import { IsInt, IsOptional, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePlacementDto {
  @ApiPropertyOptional({
    description: 'Team placement (1st, 2nd, 3rd, etc.)',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  placement?: number | null;
}
