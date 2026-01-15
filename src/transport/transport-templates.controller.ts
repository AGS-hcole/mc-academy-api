import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TransportTemplatesService } from './transport-templates.service';
import { TransportOccurrencesService } from './transport-occurrences.service';
import {
  CreateTransportTemplateDto,
  UpdateTransportTemplateDto,
  GenerateOccurrencesDto,
} from './dto';
import { AdminGuard } from '../auth/guards/admin.guard';

@ApiTags('transport-templates')
@ApiBearerAuth()
@Controller('transport-templates')
@UseGuards(AdminGuard)
export class TransportTemplatesController {
  constructor(
    private readonly templatesService: TransportTemplatesService,
    private readonly occurrencesService: TransportOccurrencesService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new transport template (ADMIN only)' })
  create(@Body() createDto: CreateTransportTemplateDto) {
    return this.templatesService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all transport templates (ADMIN only)' })
  findAll(@Query('isActive') isActive?: string) {
    const isActiveBool =
      isActive === 'true' ? true : isActive === 'false' ? false : undefined;
    return this.templatesService.findAll(isActiveBool);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a transport template by ID (ADMIN only)' })
  findOne(@Param('id') id: string) {
    return this.templatesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a transport template (ADMIN only)' })
  update(@Param('id') id: string, @Body() updateDto: UpdateTransportTemplateDto) {
    return this.templatesService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Soft delete a transport template by setting isActive to false (ADMIN only)',
  })
  remove(@Param('id') id: string) {
    return this.templatesService.remove(id);
  }

  @Post(':id/generate')
  @ApiOperation({
    summary: 'Generate occurrences for a template (ADMIN only)',
    description:
      'Creates transport occurrences based on the template recurrence rules for the specified date range',
  })
  generateOccurrences(
    @Param('id') id: string,
    @Body() generateDto: GenerateOccurrencesDto,
  ) {
    return this.occurrencesService.generateForTemplate(id, generateDto);
  }
}
