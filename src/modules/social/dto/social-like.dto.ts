import { ApiProperty } from '@nestjs/swagger';

export class SocialLikeResponseDto {
  @ApiProperty()
  targetId: string;

  @ApiProperty()
  likeCount: number;

  @ApiProperty()
  userHasLiked: boolean;
}
