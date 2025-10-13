import { IsArray, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReplaceParticipantsDto {
  @ApiProperty({
    description: 'Array of user IDs to add as participants',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  userIds: string[];
}
