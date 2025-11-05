import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FormulaType, Role } from '@prisma/client';
import {
  IsEmail,
  IsString,
  IsOptional,
  IsDateString,
  IsEnum,
  IsBoolean,
  IsNumber,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    description: "User's email",
    type: 'string',
    example: 'adress@domain.com',
  })
  @IsString()
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'First name of the user',
    type: 'string',
    example: 'Mikael',
  })
  @IsString()
  firstname: string;

  @ApiProperty({
    description: 'Last name of the user',
    type: 'string',
    example: 'Jordan',
  })
  @IsString()
  lastname: string;

  @ApiProperty({
    description: 'Role of the user',
    type: 'string',
    example: 'admin',
  })
  @IsEnum(Role)
  role: Role;

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
    type: 'number',
    example: 1,
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
}
