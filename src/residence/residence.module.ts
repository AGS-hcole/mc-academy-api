import { Module } from '@nestjs/common';
import { ResidenceController } from './residence.controller';
import { ResidenceService } from './residence.service';
import { PrismaModule } from '../prisma/prisma.module';
import { TimeModule } from '../time/time.module';

@Module({
  imports: [PrismaModule, TimeModule],
  controllers: [ResidenceController],
  providers: [ResidenceService],
  exports: [ResidenceService],
})
export class ResidenceModule {}
