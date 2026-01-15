import { Module } from '@nestjs/common';
import { TransportTemplatesController } from './transport-templates.controller';
import { TransportOccurrencesController } from './transport-occurrences.controller';
import { TransportBookingsController } from './transport-bookings.controller';
import { TransportTemplatesService } from './transport-templates.service';
import { TransportOccurrencesService } from './transport-occurrences.service';
import { TransportBookingsService } from './transport-bookings.service';
import { TransportCron } from './transport.cron';
import { PrismaService } from '../prisma/prisma.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [
    TransportTemplatesController,
    TransportOccurrencesController,
    TransportBookingsController,
  ],
  providers: [
    TransportTemplatesService,
    TransportOccurrencesService,
    TransportBookingsService,
    TransportCron,
    PrismaService,
  ],
  exports: [
    TransportTemplatesService,
    TransportOccurrencesService,
    TransportBookingsService,
  ],
})
export class TransportModule {}
