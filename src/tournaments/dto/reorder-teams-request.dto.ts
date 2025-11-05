import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class TeamOrderItem {
  @ApiProperty({
    description: 'Team ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  teamId: string;

  @ApiProperty({
    description: 'New order index',
    example: 1,
  })
  orderIndex: number;
}

export class ReorderTeamsRequestDto {
  @ApiProperty({
    description: 'Array of team IDs with new order indices',
    type: [TeamOrderItem],
    example: [
      { teamId: '123e4567-e89b-12d3-a456-426614174000', orderIndex: 1 },
      { teamId: '123e4567-e89b-12d3-a456-426614174001', orderIndex: 2 },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TeamOrderItem)
  order: TeamOrderItem[];
}
