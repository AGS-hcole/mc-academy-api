import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { TransportAssignmentStatus } from '@prisma/client';

export class AssignStudentDto {
  @ApiProperty({
    description: 'Student ID to assign',
  })
  @IsString()
  studentId: string;

  @ApiPropertyOptional({
    description: 'Assignment status',
    enum: TransportAssignmentStatus,
    default: TransportAssignmentStatus.ASSIGNED,
  })
  @IsOptional()
  @IsEnum(TransportAssignmentStatus)
  status?: TransportAssignmentStatus;
}
