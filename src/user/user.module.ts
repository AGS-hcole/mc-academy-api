import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { AuthModule } from 'src/auth/auth.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { EmailService } from 'src/common/email.service';

@Module({
  controllers: [UserController],
  providers: [UserService, EmailService],
  imports: [AuthModule, PrismaModule],
  exports: [],
})
export class UserModule {}
