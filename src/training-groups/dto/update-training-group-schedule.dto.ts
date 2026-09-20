import { PartialType } from '@nestjs/swagger';
import { CreateTrainingGroupScheduleDto } from './create-training-group-schedule.dto';

export class UpdateTrainingGroupScheduleDto extends PartialType(
  CreateTrainingGroupScheduleDto,
) {}
