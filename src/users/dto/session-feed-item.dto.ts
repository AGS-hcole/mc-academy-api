import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SocialTargetTypeDto } from '../../social/dto';

export class SessionFeedItemDto {
  @ApiProperty({
    description: 'Session ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  sessionId: string;

  @ApiProperty({
    description: 'Session date in ISO format',
    example: '2025-01-15T00:00:00.000Z',
  })
  date: string;

  @ApiProperty({
    description: 'Session slot',
    enum: ['AM', 'PM'],
    example: 'AM',
  })
  slot: string;

  @ApiPropertyOptional({
    description: 'Optional specific start time for the session',
    example: '2025-01-15T09:00:00.000Z',
  })
  startTime?: string;

  @ApiPropertyOptional({
    description: 'Optional specific end time for the session',
    example: '2025-01-15T11:00:00.000Z',
  })
  endTime?: string;

  @ApiProperty({
    description: 'Site ID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  siteId: string;

  @ApiProperty({
    description: 'Site name',
    example: 'Tennis Club de Paris',
  })
  siteName: string;

  @ApiProperty({
    description: 'Status of this user on this session',
    enum: ['YES', 'NO'],
    example: 'YES',
  })
  userStatus: string;

  @ApiProperty({
    nullable: true,
    description:
      'Rating received by this user from admins for this session, or null if not rated yet (0-10 scale)',
    example: 8,
  })
  userRating: number | null;

  @ApiProperty({
    nullable: true,
    description:
      'Average rating of all participants for this session, or null if no ratings',
    example: 7.5,
  })
  averageRating: number | null;

  @ApiProperty({
    description:
      'Number of participants (attendances with status YES) for this session',
    example: 12,
  })
  participantsCount: number;

  @ApiProperty({
    description: 'Social target type',
    enum: SocialTargetTypeDto,
  })
  socialTargetType: SocialTargetTypeDto;

  @ApiProperty({ description: 'Underlying entity id (session id)' })
  socialEntityId: string;

  @ApiProperty({
    description: 'Social target id (if any)',
    nullable: true,
  })
  socialTargetId: string | null;

  @ApiProperty({ description: 'Total likes count for this target' })
  likesCount: number;

  @ApiProperty({ description: 'Total comments count for this target' })
  commentsCount: number;

  @ApiProperty({
    description: 'Whether the current user has liked this target',
  })
  isLikedByUser: boolean;
}
