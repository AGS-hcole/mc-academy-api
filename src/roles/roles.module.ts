import { Module } from '@nestjs/common';
import { RolesController } from './roles.controller';
import { AuthModule } from 'src/auth/auth.module';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  controllers: [RolesController],
  imports: [AuthModule, PrismaModule],
})
export class RolesModule {}
