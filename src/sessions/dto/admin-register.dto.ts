import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AttendanceStatus } from '@prisma/client';

export class AdminRegisterDto {
  @ApiProperty({ description: 'User ID to register' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Attendance status', enum: AttendanceStatus })
  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;

  @ApiPropertyOptional({ description: 'Optional comment for the registration' })
  @IsOptional()
  @IsString()
  comment?: string;
}
