import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { TrainingGroupsController } from './training-groups.controller';
import { TrainingGroupsService } from './training-groups.service';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [TrainingGroupsController],
  providers: [TrainingGroupsService],
  exports: [TrainingGroupsService],
})
export class TrainingGroupsModule {}
