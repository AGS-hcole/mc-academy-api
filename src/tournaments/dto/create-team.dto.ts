import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsInt } from 'class-validator';

export class CreateTeamDto {
  @ApiProperty({
    description: 'Order index for the team',
    example: 0,
    required: false,
  })
  @IsOptional()
  @IsInt()
  orderIndex?: number;

  @ApiProperty({
    description: 'Lock status of the team',
    example: false,
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  locked?: boolean;

  @ApiProperty({
    description: 'Notes for the team',
    example: 'Special team notes',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
