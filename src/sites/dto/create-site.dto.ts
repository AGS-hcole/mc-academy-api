import { IsString, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSiteDto {
  @ApiProperty({ description: 'Nom du site' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Adresse du site' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'Ville du site' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'Site actif', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
