// src/sites/sites.module.ts
import { Module } from '@nestjs/common';
import { SitesService } from './sites.service';
import { SitesController } from './sites.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [SitesController],
  providers: [SitesService, PrismaService],
  exports: [SitesService],
})
export class SitesModule {}
