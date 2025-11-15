import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export enum SocialTargetTypeDto {
  SESSION = 'SESSION',
  TOURNAMENT = 'TOURNAMENT',
  // Extend when needed
}

export class SocialTargetInputDto {
  @ApiProperty({ enum: SocialTargetTypeDto })
  @IsEnum(SocialTargetTypeDto)
  targetType: SocialTargetTypeDto;

  @ApiProperty({
    description: 'ID of the underlying entity (e.g. sessionId, tournamentId)',
  })
  @IsString()
  @IsNotEmpty()
  entityId: string;
}
