import { PartialType } from '@nestjs/swagger';
import { CreateManorDto } from './create-manor.dto';

export class UpdateManorDto extends PartialType(CreateManorDto) {}
