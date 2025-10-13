import { Module } from '@nestjs/common';
import { MetadataController } from './metadata.controller';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  controllers: [MetadataController],
  imports: [AuthModule, PrismaModule],
})
export class MetadataModule {}
