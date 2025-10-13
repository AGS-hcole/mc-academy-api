import { IsArray, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReorderTeamsDto {
  @ApiProperty({
    description: 'Ordered array of team IDs',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  teamOrder: string[];
}
