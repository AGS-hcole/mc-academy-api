import { Test, TestingModule } from '@nestjs/testing';
import { EventsService } from './events.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PublicEvent } from '@prisma/client';

describe('EventsService - isActive Logic', () => {
  let service: EventsService;

  const mockPrismaService = {
    publicEvent: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);

    jest.clearAllMocks();
  });

  describe('isEventActive', () => {
    const baseEvent: PublicEvent = {
      id: 'test-id',
      slug: 'test-slug',
      name: 'Test Event',
      description: 'Test description',
      startTime: null,
      endTime: null,
      backgroundImageUrl: null,
      externalRegistrationUrl: null,
      isPublished: true,
      orderIndex: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should return true when both startTime and endTime are null', async () => {
      const event = { ...baseEvent };
      mockPrismaService.publicEvent.findUnique.mockResolvedValue(event);

      const result = await service.adminGet('test-id');
      expect(result.isActive).toBe(true);
    });

    it('should return true when current time is between startTime and endTime', async () => {
      const now = new Date();
      const pastDate = new Date(now.getTime() - 3600000); // 1 hour ago
      const futureDate = new Date(now.getTime() + 3600000); // 1 hour from now

      const event = {
        ...baseEvent,
        startTime: pastDate,
        endTime: futureDate,
      };
      mockPrismaService.publicEvent.findUnique.mockResolvedValue(event);

      const result = await service.adminGet('test-id');
      expect(result.isActive).toBe(true);
    });

    it('should return false when current time is before startTime', async () => {
      const now = new Date();
      const futureStart = new Date(now.getTime() + 3600000); // 1 hour from now
      const futureEnd = new Date(now.getTime() + 7200000); // 2 hours from now

      const event = {
        ...baseEvent,
        startTime: futureStart,
        endTime: futureEnd,
      };
      mockPrismaService.publicEvent.findUnique.mockResolvedValue(event);

      const result = await service.adminGet('test-id');
      expect(result.isActive).toBe(false);
    });

    it('should return false when current time is after endTime', async () => {
      const now = new Date();
      const pastStart = new Date(now.getTime() - 7200000); // 2 hours ago
      const pastEnd = new Date(now.getTime() - 3600000); // 1 hour ago

      const event = {
        ...baseEvent,
        startTime: pastStart,
        endTime: pastEnd,
      };
      mockPrismaService.publicEvent.findUnique.mockResolvedValue(event);

      const result = await service.adminGet('test-id');
      expect(result.isActive).toBe(false);
    });

    it('should return true when only startTime is set and current time >= startTime', async () => {
      const now = new Date();
      const pastDate = new Date(now.getTime() - 3600000); // 1 hour ago

      const event = {
        ...baseEvent,
        startTime: pastDate,
        endTime: null,
      };
      mockPrismaService.publicEvent.findUnique.mockResolvedValue(event);

      const result = await service.adminGet('test-id');
      expect(result.isActive).toBe(true);
    });

    it('should return false when only startTime is set and current time < startTime', async () => {
      const now = new Date();
      const futureDate = new Date(now.getTime() + 3600000); // 1 hour from now

      const event = {
        ...baseEvent,
        startTime: futureDate,
        endTime: null,
      };
      mockPrismaService.publicEvent.findUnique.mockResolvedValue(event);

      const result = await service.adminGet('test-id');
      expect(result.isActive).toBe(false);
    });

    it('should return true when only endTime is set and current time <= endTime', async () => {
      const now = new Date();
      const futureDate = new Date(now.getTime() + 3600000); // 1 hour from now

      const event = {
        ...baseEvent,
        startTime: null,
        endTime: futureDate,
      };
      mockPrismaService.publicEvent.findUnique.mockResolvedValue(event);

      const result = await service.adminGet('test-id');
      expect(result.isActive).toBe(true);
    });

    it('should return false when only endTime is set and current time > endTime', async () => {
      const now = new Date();
      const pastDate = new Date(now.getTime() - 3600000); // 1 hour ago

      const event = {
        ...baseEvent,
        startTime: null,
        endTime: pastDate,
      };
      mockPrismaService.publicEvent.findUnique.mockResolvedValue(event);

      const result = await service.adminGet('test-id');
      expect(result.isActive).toBe(false);
    });

    it('should return true at the exact startTime', async () => {
      const now = new Date();
      const futureEnd = new Date(now.getTime() + 3600000);

      const event = {
        ...baseEvent,
        startTime: now,
        endTime: futureEnd,
      };
      mockPrismaService.publicEvent.findUnique.mockResolvedValue(event);

      const result = await service.adminGet('test-id');
      expect(result.isActive).toBe(true);
    });

    it('should return true at the exact endTime', async () => {
      const now = new Date();
      const pastStart = new Date(now.getTime() - 3600000);

      const event = {
        ...baseEvent,
        startTime: pastStart,
        endTime: now,
      };
      mockPrismaService.publicEvent.findUnique.mockResolvedValue(event);

      const result = await service.adminGet('test-id');
      expect(result.isActive).toBe(true);
    });
  });
});
