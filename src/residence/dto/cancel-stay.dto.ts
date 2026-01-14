import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsUUID, IsOptional, Matches } from 'class-validator';

export class CancelStayDto {
  @ApiProperty({
    description: 'Manor ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  manorId: string;

  @ApiPropertyOptional({
    description: 'User ID (admin only - for canceling stay for another user)',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiProperty({
    description: 'Date in YYYY-MM-DD format',
    example: '2026-01-14',
  })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Date must be in YYYY-MM-DD format',
  })
  date: string;
}
