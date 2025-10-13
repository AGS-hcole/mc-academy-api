import { Module } from '@nestjs/common';
import { MetadataController } from './metadata.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  controllers: [MetadataController],
  imports: [AuthModule],
})
export class MetadataModule {}
