import { Module } from '@nestjs/common';
import {
  ReportsController,
  RatingsReportsController,
} from './reports.controller';
import { ReportsService } from './reports.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ReportsController, RatingsReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
