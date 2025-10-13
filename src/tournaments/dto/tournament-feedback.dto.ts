import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TournamentFeedbackDto {
  @ApiProperty({ description: 'Feedback text' })
  @IsString()
  feedback: string;
}
