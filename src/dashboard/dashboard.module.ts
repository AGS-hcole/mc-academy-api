import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AuthModule } from 'src/auth/auth.module';
import { DashboardController } from './dashboard.controller';
import { UserService } from 'src/user/user.service';
import { EmailService } from 'src/common/email.service';

@Module({
  controllers: [DashboardController],
  providers: [UserService, EmailService],
  imports: [AuthModule, PrismaModule],
})
export class DashboardModule {}
