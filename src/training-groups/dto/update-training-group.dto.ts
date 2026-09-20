import { PartialType } from '@nestjs/swagger';
import { CreateTrainingGroupDto } from './create-training-group.dto';

export class UpdateTrainingGroupDto extends PartialType(CreateTrainingGroupDto) {}
