import { Module } from '@nestjs/common';
import { SocialController } from './social.controller';
import { SocialService } from './social.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';

@Module({
  controllers: [SocialController],
  providers: [SocialService],
  imports: [PrismaModule, AuthModule],
  exports: [SocialService],
})
export class SocialModule {}
