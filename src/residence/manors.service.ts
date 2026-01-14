import { Injectable, NotFoundException } from '@nestjs/common';
import { ResidenceRepository } from './residence.repository';
import { CreateManorDto, UpdateManorDto } from './dto';

@Injectable()
export class ManorsService {
  constructor(private readonly repository: ResidenceRepository) {}

  async findAll(activeOnly?: boolean) {
    return this.repository.findAllManors(activeOnly);
  }

  async findOne(id: string) {
    const manor = await this.repository.findManorById(id);
    if (!manor) {
      throw new NotFoundException('Manor not found');
    }
    return manor;
  }

  async create(dto: CreateManorDto) {
    return this.repository.createManor(dto);
  }

  async update(id: string, dto: UpdateManorDto) {
    await this.findOne(id); // Check existence
    return this.repository.updateManor(id, dto);
  }

  async delete(id: string) {
    await this.findOne(id); // Check existence
    return this.repository.softDeleteManor(id);
  }
}
