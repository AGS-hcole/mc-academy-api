import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransportTemplateDto, UpdateTransportTemplateDto } from './dto';

@Injectable()
export class TransportTemplatesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new transport template
   */
  async create(dto: CreateTransportTemplateDto) {
    // Validate daysOfWeek (1-7)
    for (const day of dto.daysOfWeek) {
      if (day < 1 || day > 7) {
        throw new BadRequestException(
          'daysOfWeek must contain values between 1 (Monday) and 7 (Sunday)',
        );
      }
    }

    // Check if destination exists
    const destination = await this.prisma.school.findUnique({
      where: { id: dto.destinationId },
    });

    if (!destination) {
      throw new NotFoundException(
        `School with ID ${dto.destinationId} not found`,
      );
    }

    // Check if default driver exists (if provided)
    if (dto.defaultDriverId) {
      const driver = await this.prisma.user.findUnique({
        where: { id: dto.defaultDriverId },
      });

      if (!driver) {
        throw new NotFoundException(
          `User with ID ${dto.defaultDriverId} not found`,
        );
      }
    }

    // Convert date strings to Date objects
    const data: any = {
      ...dto,
      activeFrom: dto.activeFrom ? new Date(dto.activeFrom) : null,
      activeTo: dto.activeTo ? new Date(dto.activeTo) : null,
    };

    return this.prisma.transportTemplate.create({
      data,
      include: {
        destination: true,
        defaultDriver: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Get all transport templates
   */
  async findAll() {
    return this.prisma.transportTemplate.findMany({
      include: {
        destination: true,
        defaultDriver: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            email: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  /**
   * Get a single transport template
   */
  async findOne(id: string) {
    const template = await this.prisma.transportTemplate.findUnique({
      where: { id },
      include: {
        destination: true,
        defaultDriver: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            email: true,
          },
        },
      },
    });

    if (!template) {
      throw new NotFoundException(`Transport template with ID ${id} not found`);
    }

    return template;
  }

  /**
   * Update a transport template
   */
  async update(id: string, dto: UpdateTransportTemplateDto) {
    // Check if template exists
    await this.findOne(id);

    // Validate daysOfWeek if provided
    if (dto.daysOfWeek) {
      for (const day of dto.daysOfWeek) {
        if (day < 1 || day > 7) {
          throw new BadRequestException(
            'daysOfWeek must contain values between 1 (Monday) and 7 (Sunday)',
          );
        }
      }
    }

    // Check if destination exists (if provided)
    if (dto.destinationId) {
      const destination = await this.prisma.school.findUnique({
        where: { id: dto.destinationId },
      });

      if (!destination) {
        throw new NotFoundException(
          `School with ID ${dto.destinationId} not found`,
        );
      }
    }

    // Check if default driver exists (if provided)
    if (dto.defaultDriverId) {
      const driver = await this.prisma.user.findUnique({
        where: { id: dto.defaultDriverId },
      });

      if (!driver) {
        throw new NotFoundException(
          `User with ID ${dto.defaultDriverId} not found`,
        );
      }
    }

    // Convert date strings to Date objects
    const data: any = { ...dto };
    if (dto.activeFrom) {
      data.activeFrom = new Date(dto.activeFrom);
    }
    if (dto.activeTo) {
      data.activeTo = new Date(dto.activeTo);
    }

    return this.prisma.transportTemplate.update({
      where: { id },
      data,
      include: {
        destination: true,
        defaultDriver: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Delete a transport template
   */
  async remove(id: string) {
    // Check if template exists
    await this.findOne(id);

    await this.prisma.transportTemplate.delete({
      where: { id },
    });

    return { message: 'Transport template deleted successfully' };
  }

  /**
   * Get active templates for a specific weekday
   */
  async findActiveForWeekday(weekday: number, date: Date) {
    return this.prisma.transportTemplate.findMany({
      where: {
        daysOfWeek: {
          has: weekday,
        },
        OR: [
          {
            AND: [{ activeFrom: { lte: date } }, { activeTo: { gte: date } }],
          },
          {
            AND: [{ activeFrom: null }, { activeTo: null }],
          },
          {
            AND: [{ activeFrom: { lte: date } }, { activeTo: null }],
          },
          {
            AND: [{ activeFrom: null }, { activeTo: { gte: date } }],
          },
        ],
      },
      include: {
        destination: true,
        defaultDriver: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            email: true,
          },
        },
      },
    });
  }
}
