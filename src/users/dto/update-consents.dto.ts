import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateConsentsDto {
  @ApiProperty({
    description: 'Privacy consent (required)',
    type: 'boolean',
    example: true,
  })
  @IsBoolean()
  privacyConsent: boolean;

  @ApiPropertyOptional({
    description: 'Photo consent',
    type: 'boolean',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  photoConsent?: boolean;

  @ApiPropertyOptional({
    description: 'Marketing consent',
    type: 'boolean',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  marketingConsent?: boolean;
}
