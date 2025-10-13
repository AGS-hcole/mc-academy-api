import {
  IsString,
  IsEnum,
  IsDateString,
  IsOptional,
  IsLatitude,
  IsLongitude,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TournamentType } from '@prisma/client';

export class CreateTournamentDto {
  @ApiProperty({ description: 'Tournament title' })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Tournament type',
    enum: TournamentType,
  })
  @IsEnum(TournamentType)
  type: TournamentType;

  @ApiProperty({ description: 'Address line 1' })
  @IsString()
  addressLine1: string;

  @ApiPropertyOptional({ description: 'Address line 2' })
  @IsOptional()
  @IsString()
  addressLine2?: string;

  @ApiProperty({ description: 'Postal code' })
  @IsString()
  postalCode: string;

  @ApiProperty({ description: 'City' })
  @IsString()
  city: string;

  @ApiProperty({ description: 'Country' })
  @IsString()
  country: string;

  @ApiPropertyOptional({ description: 'Latitude' })
  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @ApiPropertyOptional({ description: 'Longitude' })
  @IsOptional()
  @IsLongitude()
  longitude?: number;

  @ApiProperty({ description: 'Tournament start date (ISO string)' })
  @IsDateString()
  startsAt: string;

  @ApiProperty({ description: 'Tournament end date (ISO string)' })
  @IsDateString()
  endsAt: string;
}
