import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsString } from 'class-validator';

export class ConfirmPresenceDto {
  @ApiProperty({
    description: 'Student ID',
  })
  @IsString()
  studentId: string;

  @ApiProperty({
    description: 'Night date (YYYY-MM-DD)',
    example: '2025-11-17',
  })
  @IsDateString()
  date: string;

  @ApiProperty({
    description: 'Whether the student was confirmed present',
  })
  @IsBoolean()
  confirmedPresent: boolean;
}
