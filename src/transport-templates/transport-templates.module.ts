import { Module } from '@nestjs/common';
import { TransportTemplatesController } from './transport-templates.controller';
import { TransportTemplatesService } from './transport-templates.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TransportTemplatesController],
  providers: [TransportTemplatesService],
  exports: [TransportTemplatesService],
})
export class TransportTemplatesModule {}
