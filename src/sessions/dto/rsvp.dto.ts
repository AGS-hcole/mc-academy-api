import { AttendanceStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class RsvpDto {
  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;

  @IsOptional()
  @IsString()
  comment?: string;
}
