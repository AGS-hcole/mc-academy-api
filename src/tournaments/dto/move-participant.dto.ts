import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID } from 'class-validator';

export class MoveParticipantDto {
  @ApiProperty({
    description: 'ID of participant to move',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsUUID()
  participantId: string;

  @ApiProperty({
    description: 'Target team ID (null to move to bench)',
    example: '123e4567-e89b-12d3-a456-426614174001',
    required: false,
    nullable: true,
  })
  @IsString()
  @IsUUID()
  @IsOptional()
  targetTeamId?: string | null;
}
