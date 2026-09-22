import { ApiPropertyOptional } from '@nestjs/swagger';
import { FormulaType, Role } from '@prisma/client';
import {
  IsString,
  IsOptional,
  IsDateString,
  IsEnum,
  IsBoolean,
  IsEmail,
  IsNumber,
  IsArray,
  IsUUID,
} from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({
    description: 'First name of the user',
    type: 'string',
    example: 'Mikael',
  })
  @IsOptional()
  @IsString()
  firstname?: string;

  @ApiPropertyOptional({
    description: 'Last name of the user',
    type: 'string',
    example: 'Jordan',
  })
  @IsOptional()
  @IsString()
  lastname?: string;

  @ApiPropertyOptional({
    description: "User's email",
    type: 'string',
    example: 'adress@domain.com',
  })
  @IsOptional()
  @IsString()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: 'Role of the user',
    type: 'string',
    example: 'admin',
  })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiPropertyOptional({
    description: 'Phone number',
    type: 'string',
    example: '+33123456789',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Birth date',
    type: 'string',
    example: '1990-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiPropertyOptional({
    description: 'FFT License number',
    type: 'string',
    example: '1234567',
  })
  @IsOptional()
  @IsString()
  fftLicenseNumber?: string;

  @ApiPropertyOptional({
    description: 'Current ranking',
    type: 'string',
    example: '1000',
  })
  @IsOptional()
  @IsNumber()
  currentRanking?: number;

  @ApiPropertyOptional({
    description: 'Formula type (MORNING, AFTERNOON, FULL)',
    enum: FormulaType,
    example: 'FULL',
  })
  @IsOptional()
  @IsEnum(FormulaType)
  formula?: FormulaType;

  @ApiPropertyOptional({
    description: 'Privacy consent date',
    type: 'string',
    example: '2024-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  privacyConsentAt?: string;

  @ApiPropertyOptional({
    description: 'Photo consent date',
    type: 'string',
    example: '2024-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  photoConsentAt?: string;

  @ApiPropertyOptional({
    description: 'Marketing consent date',
    type: 'string',
    example: '2024-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  marketingConsentAt?: string;

  @ApiPropertyOptional({
    description: 'Email notifications enabled',
    type: 'boolean',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  notifyEmail?: boolean;

  @ApiPropertyOptional({
    description: 'SMS notifications enabled',
    type: 'boolean',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  notifySMS?: boolean;

  @ApiPropertyOptional({
    description: 'WhatsApp notifications enabled',
    type: 'boolean',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  notifyWhatsApp?: boolean;

  @ApiPropertyOptional({
    description: 'Child user IDs to associate (only for role=parent)',
    type: [String],
    example: ['uuid1', 'uuid2'],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  childUserIds?: string[];
}
