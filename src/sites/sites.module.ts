// src/sites/sites.module.ts
import { Module } from '@nestjs/common';
import { SitesService } from './sites.service';
import { SitesController } from './sites.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  controllers: [SitesController],
  imports: [AuthModule],
  providers: [SitesService, PrismaService],
  exports: [SitesService],
})
export class SitesModule {}
