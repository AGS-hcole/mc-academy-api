import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  ArrayUnique,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateTrainingGroupScheduleDto } from './create-training-group-schedule.dto';

export class CreateTrainingGroupDto {
  @ApiProperty({ description: 'Training group name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Associated site ID' })
  @IsUUID('4')
  siteId: string;

  @ApiPropertyOptional({
    description: 'Whether the group is active',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Initial member user IDs',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  memberUserIds?: string[];

  @ApiPropertyOptional({
    description: 'Initial weekly schedules',
    type: [CreateTrainingGroupScheduleDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTrainingGroupScheduleDto)
  schedules?: CreateTrainingGroupScheduleDto[];
}
