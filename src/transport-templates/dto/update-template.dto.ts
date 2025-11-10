import { PartialType } from '@nestjs/swagger';
import { CreateTransportTemplateDto } from './create-template.dto';

export class UpdateTransportTemplateDto extends PartialType(
  CreateTransportTemplateDto,
) {}
