import { IsISO8601, IsOptional, IsUUID, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ResidenceQueryDto {
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

  @ApiPropertyOptional({ description: 'Filter by manor ID (UUID)' })
  @IsOptional()
  @IsUUID()
  manorId?: string;

  @ApiPropertyOptional({
    description: 'Residence status filter',
    enum: ['all', 'planned', 'canceled'],
    default: 'all',
  })
  @IsOptional()
  @IsIn(['all', 'planned', 'canceled'])
  statusScope?: 'all' | 'planned' | 'canceled';
}
