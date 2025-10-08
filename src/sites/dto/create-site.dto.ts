import { IsString, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSiteDto {
  @ApiProperty({ description: 'Nom du site' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Site actif', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
