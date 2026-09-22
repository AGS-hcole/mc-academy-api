import { IsISO8601, IsOptional, IsUUID, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TransportsQueryDto {
  @ApiProperty({
    description: 'Start date in ISO 8601 format',
    example: '2024-01-01T00:00:00Z',
  })
  @IsISO8601()
  from!: string;

  @ApiProperty({
    description: 'End date in ISO 8601 format',
    example: '2024-12-31T23:59:59Z',
  })
  @IsISO8601()
  to!: string;

  @ApiPropertyOptional({ description: 'Filter by user ID (UUID)' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Filter by transport template ID (UUID)',
  })
  @IsOptional()
  @IsUUID()
  templateId?: string;

  @ApiPropertyOptional({
    description: 'Transport booking status filter',
    enum: ['all', 'confirmed', 'cancelled'],
    default: 'all',
  })
  @IsOptional()
  @IsIn(['all', 'confirmed', 'cancelled'])
  statusScope?: 'all' | 'confirmed' | 'cancelled';
}
