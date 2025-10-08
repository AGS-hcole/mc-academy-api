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

@Module({
  imports: [
    ConfigModule.forRoot(),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    NotificationsModule,
    UserModule,
    DashboardModule,
    RolesModule,
    SessionsModule,
    SitesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
