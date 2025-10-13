import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TournamentRsvpDto {
  @ApiProperty({
    description: 'RSVP status',
    enum: ['CONFIRMED', 'DECLINED'],
  })
  @IsEnum(['CONFIRMED', 'DECLINED'])
  status: 'CONFIRMED' | 'DECLINED';
}
