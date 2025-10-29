import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID } from 'class-validator';

export class SwapParticipantsDto {
  @ApiProperty({
    description: 'ID of first participant',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsUUID()
  participantIdA: string;

  @ApiProperty({
    description: 'ID of second participant (can be from bench)',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsString()
  @IsUUID()
  participantIdB: string;
}
