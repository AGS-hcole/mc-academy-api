import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateEventDto,
  UpdateEventDto,
  QueryEventsDto,
  EventResponseDto,
  PaginatedEventsResponseDto,
  SortOption,
} from './dto';
import { slugify, generateUniqueSlug } from './utils/slug.util';
import { PublicEvent } from '@prisma/client';

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Maps a PublicEvent to EventResponseDto with computed isActive field
   */
  private mapToResponseDto(event: PublicEvent): EventResponseDto {
    return {
      id: event.id,
      slug: event.slug,
      name: event.name,
      description: event.description,
      startTime: event.startTime?.toISOString(),
      endTime: event.endTime?.toISOString(),
      backgroundImageUrl: event.backgroundImageUrl,
      externalRegistrationUrl: event.externalRegistrationUrl,
      isPublished: event.isPublished,
      orderIndex: event.orderIndex,
      isActive: this.isEventActive(event),
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt.toISOString(),
    };
  }

  /**
   * Determines if an event is currently active based on startTime/endTime.
   * An event is active if:
   * - Both startTime and endTime are null (no time restrictions)
   * - Current time is between startTime and endTime (if both exist)
   * - Current time >= startTime (if only startTime exists)
   * - Current time <= endTime (if only endTime exists)
   */
  private isEventActive(event: PublicEvent): boolean {
    const now = new Date();

    // No time restrictions
    if (!event.startTime && !event.endTime) {
      return true;
    }

    // Both times specified
    if (event.startTime && event.endTime) {
      return now >= event.startTime && now <= event.endTime;
    }

    // Only startTime specified
    if (event.startTime) {
      return now >= event.startTime;
    }

    // Only endTime specified
    if (event.endTime) {
      return now <= event.endTime;
    }

    return false;
  }

  /**
   * Builds the where clause for filtering events based on query parameters
   */
  private buildWhereClause(query: QueryEventsDto, forcePublished = false) {
    const where: any = {};

    // Published filter
    if (forcePublished || query.publishedOnly) {
      where.isPublished = true;
    }

    // Search filter (name and description)
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // Active filter
    if (query.activeOnly) {
      const now = new Date();
      where.OR = where.OR || [];

      // Add active conditions
      const activeConditions = {
        OR: [
          // No time restrictions
          { AND: [{ startTime: null }, { endTime: null }] },
          // Both times specified and active
          {
            AND: [{ startTime: { lte: now } }, { endTime: { gte: now } }],
          },
          // Only startTime specified
          {
            AND: [{ startTime: { lte: now } }, { endTime: null }],
          },
          // Only endTime specified
          {
            AND: [{ startTime: null }, { endTime: { gte: now } }],
          },
        ],
      };

      // Merge with existing OR conditions if search is also applied
      if (where.OR && where.OR.length > 0) {
        const searchConditions = where.OR;
        where.AND = [{ OR: searchConditions }, activeConditions];
        delete where.OR;
      } else {
        where.OR = activeConditions.OR;
      }
    }

    // Date range filters
    if (query.from || query.to) {
      const dateConditions: any = { OR: [] };

      if (query.from && query.to) {
        const from = new Date(query.from);
        const to = new Date(query.to);

        // Event overlaps with the range
        dateConditions.OR.push(
          {
            AND: [{ startTime: { lte: to } }, { endTime: { gte: from } }],
          },
          // Events with no time restrictions
          { AND: [{ startTime: null }, { endTime: null }] },
        );
      } else if (query.from) {
        const from = new Date(query.from);
        dateConditions.OR.push(
          { endTime: { gte: from } },
          { AND: [{ endTime: null }, { startTime: { gte: from } }] },
          { AND: [{ startTime: null }, { endTime: null }] },
        );
      } else if (query.to) {
        const to = new Date(query.to);
        dateConditions.OR.push(
          { startTime: { lte: to } },
          { AND: [{ startTime: null }, { endTime: { lte: to } }] },
          { AND: [{ startTime: null }, { endTime: null }] },
        );
      }

      where.AND = where.AND || [];
      if (Array.isArray(where.AND)) {
        where.AND.push(dateConditions);
      } else {
        where.AND = [where.AND, dateConditions];
      }
    }

    return where;
  }

  /**
   * List events with filters and pagination (public endpoint)
   */
  async listPublic(query: QueryEventsDto): Promise<PaginatedEventsResponseDto> {
    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const skip = (page - 1) * pageSize;

    // Force publishedOnly for public endpoints
    const where = this.buildWhereClause(
      { ...query, publishedOnly: true },
      true,
    );

    // Build orderBy
    const orderBy: any[] = [];
    if (query.sort === SortOption.RECENT) {
      orderBy.push({ createdAt: 'desc' });
    } else {
      // Default: order by orderIndex ASC, then createdAt DESC
      orderBy.push({ orderIndex: 'asc' });
      orderBy.push({ createdAt: 'desc' });
    }

    const [items, total] = await Promise.all([
      this.prisma.publicEvent.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
      }),
      this.prisma.publicEvent.count({ where }),
    ]);

    return {
      items: items.map(item => this.mapToResponseDto(item)),
      page,
      pageSize,
      total,
    };
  }

  /**
   * Get a single published event by slug (public endpoint)
   */
  async getPublicBySlug(slug: string): Promise<EventResponseDto> {
    const event = await this.prisma.publicEvent.findUnique({
      where: { slug },
    });

    if (!event || !event.isPublished) {
      throw new NotFoundException(`Event with slug "${slug}" not found`);
    }

    return this.mapToResponseDto(event);
  }

  /**
   * List all events with filters and pagination (admin endpoint)
   */
  async adminList(query: QueryEventsDto): Promise<PaginatedEventsResponseDto> {
    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const skip = (page - 1) * pageSize;

    // Don't force publishedOnly for admin
    const where = this.buildWhereClause(query, false);

    // Build orderBy
    const orderBy: any[] = [];
    if (query.sort === SortOption.RECENT) {
      orderBy.push({ createdAt: 'desc' });
    } else {
      orderBy.push({ orderIndex: 'asc' });
      orderBy.push({ createdAt: 'desc' });
    }

    const [items, total] = await Promise.all([
      this.prisma.publicEvent.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
      }),
      this.prisma.publicEvent.count({ where }),
    ]);

    return {
      items: items.map(item => this.mapToResponseDto(item)),
      page,
      pageSize,
      total,
    };
  }

  /**
   * Get a single event by ID (admin endpoint)
   */
  async adminGet(id: string): Promise<EventResponseDto> {
    const event = await this.prisma.publicEvent.findUnique({
      where: { id },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID "${id}" not found`);
    }

    return this.mapToResponseDto(event);
  }

  /**
   * Create a new event (admin endpoint)
   */
  async create(dto: CreateEventDto): Promise<EventResponseDto> {
    // Validate startTime < endTime if both are provided
    if (dto.startTime && dto.endTime) {
      const start = new Date(dto.startTime);
      const end = new Date(dto.endTime);
      if (start >= end) {
        throw new BadRequestException('endTime must be after startTime');
      }
    }

    // Generate slug if not provided
    let slug = dto.slug;
    if (!slug) {
      const baseSlug = slugify(dto.name);
      slug = await generateUniqueSlug(baseSlug, async s => {
        const existing = await this.prisma.publicEvent.findUnique({
          where: { slug: s },
        });
        return !!existing;
      });
    } else {
      // Check if slug already exists
      const existing = await this.prisma.publicEvent.findUnique({
        where: { slug },
      });
      if (existing) {
        throw new ConflictException(`Slug "${slug}" already exists`);
      }
    }

    const event = await this.prisma.publicEvent.create({
      data: {
        slug,
        name: dto.name,
        description: dto.description,
        startTime: dto.startTime ? new Date(dto.startTime) : null,
        endTime: dto.endTime ? new Date(dto.endTime) : null,
        backgroundImageUrl: dto.backgroundImageUrl,
        externalRegistrationUrl: dto.externalRegistrationUrl,
        isPublished: dto.isPublished ?? false,
        orderIndex: dto.orderIndex ?? 0,
      },
    });

    return this.mapToResponseDto(event);
  }

  /**
   * Update an existing event (admin endpoint)
   */
  async update(id: string, dto: UpdateEventDto): Promise<EventResponseDto> {
    const existing = await this.prisma.publicEvent.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Event with ID "${id}" not found`);
    }

    // Validate startTime < endTime
    const startTime = dto.startTime
      ? new Date(dto.startTime)
      : existing.startTime;
    const endTime = dto.endTime ? new Date(dto.endTime) : existing.endTime;

    if (startTime && endTime && startTime >= endTime) {
      throw new BadRequestException('endTime must be after startTime');
    }

    // Handle slug update
    let slug = existing.slug;
    if (dto.slug && dto.slug !== existing.slug) {
      const slugExists = await this.prisma.publicEvent.findUnique({
        where: { slug: dto.slug },
      });
      if (slugExists) {
        throw new ConflictException(`Slug "${dto.slug}" already exists`);
      }
      slug = dto.slug;
    }

    const event = await this.prisma.publicEvent.update({
      where: { id },
      data: {
        slug,
        name: dto.name,
        description: dto.description,
        startTime: dto.startTime ? new Date(dto.startTime) : undefined,
        endTime: dto.endTime ? new Date(dto.endTime) : undefined,
        backgroundImageUrl: dto.backgroundImageUrl,
        externalRegistrationUrl: dto.externalRegistrationUrl,
        isPublished: dto.isPublished,
        orderIndex: dto.orderIndex,
      },
    });

    return this.mapToResponseDto(event);
  }

  /**
   * Delete an event (admin endpoint)
   */
  async delete(id: string): Promise<void> {
    const existing = await this.prisma.publicEvent.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Event with ID "${id}" not found`);
    }

    await this.prisma.publicEvent.delete({
      where: { id },
    });
  }
}
