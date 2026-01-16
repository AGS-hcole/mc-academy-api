import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { UserModule } from './user/user.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsModule } from './notifications/notifications.module';
import { RolesModule } from './roles/roles.module';
import { SessionsModule } from './sessions/sessions.module';
import { SitesModule } from './sites/sites.module';
import { ReportsModule } from './reports/reports.module';
import { UsersModule } from './users/users.module';
import { MetadataModule } from './metadata/metadata.module';
import { TournamentsModule } from './tournaments/tournaments.module';
import { RatingsModule } from './ratings/ratings.module';
import { EventsModule } from './events/events.module';
import { SocialModule } from './social/social.module';
import { ResidenceModule } from './residence/residence.module';
import { TransportModule } from './transport/transport.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    NotificationsModule,
    UserModule,
    UsersModule,
    DashboardModule,
    RolesModule,
    SessionsModule,
    SitesModule,
    ReportsModule,
    MetadataModule,
    TournamentsModule,
    RatingsModule,
    EventsModule,
    SocialModule,
    ResidenceModule,
    TransportModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
