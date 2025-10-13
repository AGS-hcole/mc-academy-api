import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  Length,
  Matches,
  IsISO8601,
} from 'class-validator';
import { IsPastDate } from '../../common/validators/is-past-date.validator';

export class UpdateMeDto {
  @ApiPropertyOptional({
    description: 'First name',
    type: 'string',
    example: 'Hubert',
    minLength: 2,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @Length(2, 100)
  firstname?: string;

  @ApiPropertyOptional({
    description: 'Last name',
    type: 'string',
    example: 'Cole',
    minLength: 2,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @Length(2, 100)
  lastname?: string;

  @ApiPropertyOptional({
    description: 'Phone number',
    type: 'string',
    example: '+33611223344',
    pattern: '^\\+?[0-9\\s\\.\\-]{7,15}$',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9\s\.\-]{7,15}$/, {
    message: 'Phone number must be a valid format',
  })
  phone?: string;

  @ApiPropertyOptional({
    description: 'Birth date (ISO format)',
    type: 'string',
    example: '1991-05-20',
  })
  @IsOptional()
  @IsISO8601()
  @IsPastDate()
  birthDate?: string;

  @ApiPropertyOptional({
    description: 'FFT License number',
    type: 'string',
    example: 'FFT-123456',
    minLength: 3,
    maxLength: 64,
  })
  @IsOptional()
  @IsString()
  @Length(3, 64)
  fftLicenseNumber?: string;

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
}
