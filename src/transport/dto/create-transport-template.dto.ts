import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  IsArray,
  Min,
  Max,
  ArrayMinSize,
  Matches,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TransportRecurrenceType } from '@prisma/client';

export class CreateTransportTemplateDto {
  @ApiProperty({ description: 'Name of the transport template' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Description of the transport' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Origin label (e.g., "Paris Gare de Lyon")' })
  @IsString()
  fromLabel: string;

  @ApiPropertyOptional({ description: 'Origin full address' })
  @IsOptional()
  @IsString()
  fromAddress?: string;

  @ApiPropertyOptional({ description: 'Origin latitude' })
  @IsOptional()
  @IsInt()
  fromLat?: number;

  @ApiPropertyOptional({ description: 'Origin longitude' })
  @IsOptional()
  @IsInt()
  fromLng?: number;

  @ApiProperty({ description: 'Destination label (e.g., "Bordeaux St-Jean")' })
  @IsString()
  toLabel: string;

  @ApiPropertyOptional({ description: 'Destination full address' })
  @IsOptional()
  @IsString()
  toAddress?: string;

  @ApiPropertyOptional({ description: 'Destination latitude' })
  @IsOptional()
  @IsInt()
  toLat?: number;

  @ApiPropertyOptional({ description: 'Destination longitude' })
  @IsOptional()
  @IsInt()
  toLng?: number;

  @ApiPropertyOptional({
    description: 'Timezone for scheduling (default: Europe/Paris)',
    default: 'Europe/Paris',
  })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({
    description: 'Capacity (number of seats)',
    default: 4,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @ApiPropertyOptional({
    description: 'Allow overbooking above capacity',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  allowOverbook?: boolean;

  @ApiPropertyOptional({
    description: 'Is the template active',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Recurrence type',
    enum: TransportRecurrenceType,
    default: TransportRecurrenceType.WEEKLY,
  })
  @IsOptional()
  @IsEnum(TransportRecurrenceType)
  recurrenceType?: TransportRecurrenceType;

  @ApiProperty({
    description: 'Days of the week (1=Monday, 7=Sunday)',
    type: [Number],
    example: [1, 3, 5],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  daysOfWeek: number[];

  @ApiProperty({
    description: 'Time of day in HH:mm format (24-hour)',
    example: '14:50',
  })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'timeOfDay must be in HH:mm format (e.g., 14:50)',
  })
  timeOfDay: string;
}
