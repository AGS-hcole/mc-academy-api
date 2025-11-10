import { Module } from '@nestjs/common';
import { TransportPlansController } from './transport-plans.controller';
import { TransportPlansService } from './transport-plans.service';
import { PrismaModule } from '../prisma/prisma.module';
import { TimeModule } from '../time/time.module';
import { TransportTemplatesModule } from '../transport-templates/transport-templates.module';

@Module({
  imports: [PrismaModule, TimeModule, TransportTemplatesModule],
  controllers: [TransportPlansController],
  providers: [TransportPlansService],
  exports: [TransportPlansService],
})
export class TransportPlansModule {}
