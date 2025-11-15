import { ApiProperty } from '@nestjs/swagger';
import { SessionFeedItemDto } from './session-feed-item.dto';

export class SessionFeedResponseDto {
  @ApiProperty({
    type: [SessionFeedItemDto],
    description: 'Array of session feed items',
  })
  items: SessionFeedItemDto[];

  @ApiProperty({
    nullable: true,
    description:
      'Cursor to fetch the next page, or null if there is no more data',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  nextCursor: string | null;

  @ApiProperty({
    description: 'True if there is another page after this one',
    example: true,
  })
  hasMore: boolean;
}
