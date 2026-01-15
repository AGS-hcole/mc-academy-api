import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateTransportTemplateDto,
  UpdateTransportTemplateDto,
} from './dto';

@Injectable()
export class TransportTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTransportTemplateDto) {
    return this.prisma.transportTemplate.create({
      data: {
        name: dto.name,
        description: dto.description,
        fromLabel: dto.fromLabel,
        fromAddress: dto.fromAddress,
        fromLat: dto.fromLat,
        fromLng: dto.fromLng,
        toLabel: dto.toLabel,
        toAddress: dto.toAddress,
        toLat: dto.toLat,
        toLng: dto.toLng,
        timezone: dto.timezone ?? 'Europe/Paris',
        capacity: dto.capacity ?? 4,
        allowOverbook: dto.allowOverbook ?? false,
        isActive: dto.isActive ?? true,
        recurrenceType: dto.recurrenceType ?? 'WEEKLY',
        daysOfWeek: dto.daysOfWeek,
        timeOfDay: dto.timeOfDay,
      },
    });
  }

  async findAll(isActive?: boolean) {
    const where = isActive !== undefined ? { isActive } : undefined;
    return this.prisma.transportTemplate.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const template = await this.prisma.transportTemplate.findUnique({
      where: { id },
      include: {
        occurrences: {
          orderBy: { departureAt: 'asc' },
          take: 10, // Show first 10 upcoming occurrences
        },
      },
    });

    if (!template) {
      throw new NotFoundException(`Transport template with ID ${id} not found`);
    }

    return template;
  }

  async update(id: string, dto: UpdateTransportTemplateDto) {
    // Check if exists
    await this.findOne(id);

    return this.prisma.transportTemplate.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        fromLabel: dto.fromLabel,
        fromAddress: dto.fromAddress,
        fromLat: dto.fromLat,
        fromLng: dto.fromLng,
        toLabel: dto.toLabel,
        toAddress: dto.toAddress,
        toLat: dto.toLat,
        toLng: dto.toLng,
        timezone: dto.timezone,
        capacity: dto.capacity,
        allowOverbook: dto.allowOverbook,
        isActive: dto.isActive,
        recurrenceType: dto.recurrenceType,
        daysOfWeek: dto.daysOfWeek,
        timeOfDay: dto.timeOfDay,
      },
    });
  }

  async remove(id: string) {
    // Check if exists
    await this.findOne(id);

    // Soft delete by setting isActive to false
    return this.prisma.transportTemplate.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
