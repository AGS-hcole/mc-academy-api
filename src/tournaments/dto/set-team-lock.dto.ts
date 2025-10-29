import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class SetTeamLockDto {
  @ApiProperty({
    description: 'Lock or unlock the team',
    example: true,
  })
  @IsBoolean()
  locked: boolean;
}
