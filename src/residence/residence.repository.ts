import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Manor, ResidenceStay, ResidenceStayStatus } from '@prisma/client';

@Injectable()
export class ResidenceRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Manor operations
  async findAllManors(activeOnly?: boolean) {
    return this.prisma.manor.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { name: 'asc' },
    });
  }

  async findManorById(id: string) {
    return this.prisma.manor.findUnique({
      where: { id },
    });
  }

  async createManor(data: {
    name: string;
    address?: string;
    city?: string;
    capacity: number;
    enforceCapacity: boolean;
    isActive: boolean;
  }): Promise<Manor> {
    return this.prisma.manor.create({
      data,
    });
  }

  async updateManor(
    id: string,
    data: {
      name?: string;
      address?: string;
      city?: string;
      capacity?: number;
      enforceCapacity?: boolean;
      isActive?: boolean;
    },
  ): Promise<Manor> {
    return this.prisma.manor.update({
      where: { id },
      data,
    });
  }

  async softDeleteManor(id: string): Promise<Manor> {
    return this.prisma.manor.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // ResidenceStay operations
  async findStaysByUser(
    userId: string,
    fromDate?: Date,
    toDate?: Date,
    includeCanceled = false,
  ) {
    return this.prisma.residenceStay.findMany({
      where: {
        userId,
        date: {
          gte: fromDate,
          lte: toDate,
        },
        status: includeCanceled
          ? undefined
          : ResidenceStayStatus.PLANNED,
      },
      include: {
        manor: true,
      },
      orderBy: { date: 'asc' },
    });
  }

  async findStaysByManorAndDate(manorId: string, date: Date) {
    return this.prisma.residenceStay.findMany({
      where: {
        manorId,
        date,
      },
      include: {
        user: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findStay(manorId: string, userId: string, date: Date) {
    return this.prisma.residenceStay.findUnique({
      where: {
        manorId_userId_date: {
          manorId,
          userId,
          date,
        },
      },
    });
  }

  async countPlannedStays(manorId: string, date: Date): Promise<number> {
    return this.prisma.residenceStay.count({
      where: {
        manorId,
        date,
        status: ResidenceStayStatus.PLANNED,
      },
    });
  }

  async createOrUpdateStay(
    manorId: string,
    userId: string,
    date: Date,
    overCapacity: boolean,
    createdByAdmin: boolean,
  ): Promise<ResidenceStay> {
    return this.prisma.residenceStay.upsert({
      where: {
        manorId_userId_date: {
          manorId,
          userId,
          date,
        },
      },
      create: {
        manorId,
        userId,
        date,
        status: ResidenceStayStatus.PLANNED,
        overCapacity,
        createdByAdmin,
      },
      update: {
        status: ResidenceStayStatus.PLANNED,
        overCapacity,
        updatedAt: new Date(),
      },
    });
  }

  async cancelStay(manorId: string, userId: string, date: Date) {
    return this.prisma.residenceStay.update({
      where: {
        manorId_userId_date: {
          manorId,
          userId,
          date,
        },
      },
      data: {
        status: ResidenceStayStatus.CANCELED,
      },
    });
  }

  // Transaction wrapper for capacity enforcement
  async createStayWithCapacityCheck(
    manorId: string,
    userId: string,
    date: Date,
    createdByAdmin: boolean,
    force: boolean,
  ): Promise<{ stay: ResidenceStay; overCapacity: boolean }> {
    return this.prisma.$transaction(async (tx) => {
      // Get manor
      const manor = await tx.manor.findUnique({
        where: { id: manorId },
      });

      if (!manor) {
        const { NotFoundException } = await import('@nestjs/common');
        throw new NotFoundException('Manor not found');
      }

      // Count planned stays
      const plannedCount = await tx.residenceStay.count({
        where: {
          manorId,
          date,
          status: ResidenceStayStatus.PLANNED,
        },
      });

      let overCapacity = false;

      if (plannedCount >= manor.capacity) {
        if (manor.enforceCapacity && !force) {
          throw new Error('CAPACITY_REACHED');
        }
        overCapacity = true;
      }

      // Create or update stay
      const stay = await tx.residenceStay.upsert({
        where: {
          manorId_userId_date: {
            manorId,
            userId,
            date,
          },
        },
        create: {
          manorId,
          userId,
          date,
          status: ResidenceStayStatus.PLANNED,
          overCapacity,
          createdByAdmin,
        },
        update: {
          status: ResidenceStayStatus.PLANNED,
          overCapacity,
          updatedAt: new Date(),
        },
      });

      return { stay, overCapacity };
    });
  }
}
