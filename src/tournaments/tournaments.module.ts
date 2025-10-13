import { Module } from '@nestjs/common';
import { TournamentsController } from './tournaments.controller';
import { MyTournamentsController } from './my-tournaments.controller';
import { TournamentsService } from './tournaments.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  controllers: [TournamentsController, MyTournamentsController],
  imports: [AuthModule],
  providers: [TournamentsService, PrismaService],
  exports: [TournamentsService],
})
export class TournamentsModule {}
