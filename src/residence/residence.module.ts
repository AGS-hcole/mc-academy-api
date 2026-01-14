import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { ManorsController } from './manors.controller';
import { ManorsService } from './manors.service';
import { StaysController } from './stays.controller';
import { StaysService } from './stays.service';
import { ResidenceRepository } from './residence.repository';
import { ResidenceTimeService } from './residence-time.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ManorsController, StaysController],
  providers: [
    ManorsService,
    StaysService,
    ResidenceRepository,
    ResidenceTimeService,
  ],
  exports: [ManorsService, StaysService, ResidenceTimeService],
})
export class ResidenceModule {}
