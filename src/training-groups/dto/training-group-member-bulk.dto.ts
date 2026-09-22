import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsString,
  IsUUID,
} from 'class-validator';

export class TrainingGroupMemberBulkDto {
  @ApiProperty({
    description: 'User IDs to add/remove',
    type: [String],
    example: ['2ce2dcf2-e33d-4791-8728-8a6c56424ca9'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsString({ each: true })
  @IsUUID('4', { each: true })
  userIds: string[];
}
