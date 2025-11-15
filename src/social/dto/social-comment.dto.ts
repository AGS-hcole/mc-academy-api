import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { SocialTargetInputDto } from './social-target.dto';

export class CreateCommentDto extends SocialTargetInputDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({
    description: 'Optional parent comment id for replies',
  })
  @IsOptional()
  @IsString()
  parentId?: string;
}

export class CommentItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  targetId: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  fullName: string;

  @ApiProperty()
  content: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  parentId?: string;
}

export class CommentPageDto {
  @ApiProperty({ type: [CommentItemDto] })
  items: CommentItemDto[];

  @ApiProperty({ nullable: true })
  nextCursor: string | null;

  @ApiProperty()
  hasMore: boolean;
}

export class CommentQueryDto extends SocialTargetInputDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
