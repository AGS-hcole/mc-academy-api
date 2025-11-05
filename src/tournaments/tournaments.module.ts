import { Module } from '@nestjs/common';
import { TournamentsController } from './tournaments.controller';
import { MyTournamentsController } from './my-tournaments.controller';
import { TournamentsTeamsController } from './tournaments-teams.controller';
import { TournamentsService } from './tournaments.service';
import { TournamentsTeamsService } from './tournaments-teams.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  controllers: [
    TournamentsController,
    MyTournamentsController,
    TournamentsTeamsController,
  ],
  imports: [AuthModule],
  providers: [TournamentsService, TournamentsTeamsService, PrismaService],
  exports: [TournamentsService, TournamentsTeamsService],
})
export class TournamentsModule {}
