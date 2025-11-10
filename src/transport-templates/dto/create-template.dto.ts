import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsInt,
  Min,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  IsOptional,
  IsDateString,
  Matches,
} from 'class-validator';
import { TransportDirection } from '@prisma/client';

export class CreateTransportTemplateDto {
  @ApiProperty({
    description: 'Template name (e.g., "Manor to School A - Morning")',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Transport direction',
    enum: TransportDirection,
  })
  @IsEnum(TransportDirection)
  direction: TransportDirection;

  @ApiProperty({
    description: 'Origin label (e.g., "Manor")',
  })
  @IsString()
  originLabel: string;

  @ApiProperty({
    description: 'Destination school ID',
  })
  @IsString()
  destinationId: string;

  @ApiProperty({
    description: 'Target time in HH:mm format (local Europe/Paris time)',
    example: '07:45',
  })
  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'targetTime must be in HH:mm format',
  })
  targetTime: string;

  @ApiProperty({
    description: 'Maximum capacity (number of seats)',
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  capacity: number;

  @ApiProperty({
    description:
      'Days of week (ISO: 1=Monday, 7=Sunday) when this template is active',
    type: [Number],
    example: [1, 2, 3, 4, 5],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @IsInt({ each: true })
  daysOfWeek: number[];

  @ApiPropertyOptional({
    description: 'Date from which this template is active',
  })
  @IsOptional()
  @IsDateString()
  activeFrom?: string;

  @ApiPropertyOptional({
    description: 'Date until which this template is active',
  })
  @IsOptional()
  @IsDateString()
  activeTo?: string;

  @ApiPropertyOptional({
    description: 'Default driver user ID',
  })
  @IsOptional()
  @IsString()
  defaultDriverId?: string;

  @ApiPropertyOptional({
    description: 'Default vehicle description',
  })
  @IsOptional()
  @IsString()
  defaultVehicle?: string;
}
