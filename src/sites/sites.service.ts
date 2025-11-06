// src/sites/sites.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSiteDto, UpdateSiteDto } from './dto';

@Injectable()
export class SitesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.site.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { sessions: true },
        },
      },
    });
  }

  async findActive() {
    return this.prisma.site.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { sessions: true },
        },
      },
    });
  }

  async findOne(id: string) {
    const site = await this.prisma.site.findUnique({
      where: { id },
      include: {
        sessions: {
          orderBy: { date: 'desc' },
          take: 10,
        },
        _count: {
          select: { sessions: true },
        },
      },
    });

    if (!site) {
      throw new NotFoundException('Site not found');
    }

    return site;
  }

  async create(dto: CreateSiteDto) {
    try {
      return await this.prisma.site.create({
        data: {
          name: dto.name,
          address: dto.address,
          city: dto.city,
          isActive: dto.isActive ?? true,
          isMorningDefault: dto.isMorningDefault ?? false,
          isAfternoonDefault: dto.isAfternoonDefault ?? false,
        },
        include: {
          _count: {
            select: { sessions: true },
          },
        },
      });
    } catch (error) {
      if (error.code === 'P2002') {
        throw new BadRequestException('A site with this name already exists');
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateSiteDto) {
    const site = await this.prisma.site.findUnique({
      where: { id },
    });

    if (!site) {
      throw new NotFoundException('Site not found');
    }

    try {
      return await this.prisma.site.update({
        where: { id },
        data: dto,
        include: {
          _count: {
            select: { sessions: true },
          },
        },
      });
    } catch (error) {
      if (error.code === 'P2002') {
        throw new BadRequestException('A site with this name already exists');
      }
      throw error;
    }
  }

  async remove(id: string) {
    const site = await this.prisma.site.findUnique({
      where: { id },
      include: {
        _count: {
          select: { sessions: true },
        },
      },
    });

    if (!site) {
      throw new NotFoundException('Site not found');
    }

    if (site._count.sessions > 0) {
      throw new BadRequestException(
        `Cannot delete site with ${site._count.sessions} associated sessions. Delete or reassign sessions first.`,
      );
    }

    await this.prisma.site.delete({
      where: { id },
    });

    return { message: 'Site deleted successfully' };
  }
}
