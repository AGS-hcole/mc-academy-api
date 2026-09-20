import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateTrainingGroupDto {
  @ApiPropertyOptional({ description: 'Training group name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Associated site ID' })
  @IsOptional()
  @IsUUID('4')
  siteId?: string;

  @ApiPropertyOptional({
    description: 'Whether the group is active',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
