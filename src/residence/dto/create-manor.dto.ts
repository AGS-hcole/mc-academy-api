import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsInt,
  IsBoolean,
  IsOptional,
  Min,
  MinLength,
} from 'class-validator';

export class CreateManorDto {
  @ApiProperty({ description: 'Manor name', example: 'Manoir Principal' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiPropertyOptional({ description: 'Address', example: '1 rue des Écoles' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'City', example: 'Montpellier' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({
    description: 'Maximum capacity (beds)',
    example: 30,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  capacity: number;

  @ApiProperty({
    description: 'Whether to enforce capacity limit',
    example: true,
    default: true,
  })
  @IsBoolean()
  enforceCapacity: boolean;

  @ApiProperty({
    description: 'Whether the manor is active',
    example: true,
    default: true,
  })
  @IsBoolean()
  isActive: boolean;
}
