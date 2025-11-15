import { ApiProperty } from '@nestjs/swagger';

export class SocialLikeResponseDto {
  @ApiProperty()
  targetId: string;

  @ApiProperty()
  likesCount: number;

  @ApiProperty()
  userHasLiked: boolean;
}
