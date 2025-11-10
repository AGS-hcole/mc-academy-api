import { Module } from '@nestjs/common';
import { TransportRunsController } from './transport-runs.controller';
import { TransportRunsService } from './transport-runs.service';
import { TransportRunsCron } from './transport-runs.cron';
import { PrismaModule } from '../prisma/prisma.module';
import { TimeModule } from '../time/time.module';
import { TransportTemplatesModule } from '../transport-templates/transport-templates.module';

@Module({
  imports: [PrismaModule, TimeModule, TransportTemplatesModule],
  controllers: [TransportRunsController],
  providers: [TransportRunsService, TransportRunsCron],
  exports: [TransportRunsService],
})
export class TransportRunsModule {}
