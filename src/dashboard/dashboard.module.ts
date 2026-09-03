import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AuthModule } from 'src/auth/auth.module';
import {
  DashboardController,
  AdminDashboardController,
  ParentDashboardController,
} from './dashboard.controller';
import { AdminDashboardService } from './admin-dashboard.service';
import { ParentDashboardService } from './parent-dashboard.service';
import { UserService } from 'src/user/user.service';
import { EmailService } from 'src/common/email.service';

@Module({
  controllers: [
    DashboardController,
    AdminDashboardController,
    ParentDashboardController,
  ],
  providers: [
    UserService,
    EmailService,
    AdminDashboardService,
    ParentDashboardService,
  ],
  imports: [AuthModule, PrismaModule],
})
export class DashboardModule {}
