import { Module } from '@nestjs/common';
import { RatingsController } from './ratings.controller';
import { RatingsService } from './ratings.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  controllers: [RatingsController],
  imports: [PrismaModule, AuthModule],
  providers: [RatingsService],
  exports: [RatingsService],
})
export class RatingsModule {}
