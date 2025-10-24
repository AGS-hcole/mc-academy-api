import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EventResponseDto {
  @ApiProperty({ description: 'Event ID', example: 'uuid-here' })
  id: string;

  @ApiProperty({ description: 'URL slug', example: 'adults-training-camp' })
  slug: string;

  @ApiProperty({ description: 'Event name', example: 'Adults Training Camp' })
  name: string;

  @ApiPropertyOptional({
    description: 'Event description',
    example: 'Intensive training camp',
  })
  description?: string;

  @ApiPropertyOptional({
    description: 'Start time (ISO8601)',
    example: '2025-11-01T08:00:00.000Z',
  })
  startTime?: string;

  @ApiPropertyOptional({
    description: 'End time (ISO8601)',
    example: '2025-11-01T16:00:00.000Z',
  })
  endTime?: string;

  @ApiPropertyOptional({
    description: 'Background image URL',
    example: 'https://cdn.example.com/mca/camps/adults.jpg',
  })
  backgroundImageUrl?: string;

  @ApiPropertyOptional({
    description: 'External registration URL',
    example: 'https://forms.gle/xxxx',
  })
  externalRegistrationUrl?: string;

  @ApiProperty({ description: 'Published status', example: true })
  isPublished: boolean;

  @ApiProperty({ description: 'Display order', example: 10 })
  orderIndex: number;

  @ApiProperty({
    description: 'Whether the event is currently active (computed)',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2025-01-01T00:00:00.000Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2025-01-02T00:00:00.000Z',
  })
  updatedAt: string;
}

export class PaginatedEventsResponseDto {
  @ApiProperty({ type: [EventResponseDto] })
  items: EventResponseDto[];

  @ApiProperty({ description: 'Current page number', example: 1 })
  page: number;

  @ApiProperty({ description: 'Number of items per page', example: 20 })
  pageSize: number;

  @ApiProperty({ description: 'Total number of items', example: 42 })
  total: number;
}
