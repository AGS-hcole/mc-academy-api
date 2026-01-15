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
  Logger,
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
import { DateTime } from 'luxon';

@ApiTags('transport-templates')
@ApiBearerAuth()
@Controller('transport-templates')
@UseGuards(AdminGuard)
export class TransportTemplatesController {
  private readonly logger = new Logger(TransportTemplatesController.name);

  constructor(
    private readonly templatesService: TransportTemplatesService,
    private readonly occurrencesService: TransportOccurrencesService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new transport template (ADMIN only)' })
  async create(@Body() createDto: CreateTransportTemplateDto) {
    // Create the template
    const template = await this.templatesService.create(createDto);

    // Automatically generate initial occurrences for the next 30 days if template is active
    if (template.isActive) {
      try {
        const now = DateTime.now().setZone(template.timezone);
        const fromDate = now.toFormat('yyyy-MM-dd');
        const toDate = now.plus({ days: 30 }).toFormat('yyyy-MM-dd');

        const result = await this.occurrencesService.generateForTemplate(
          template.id,
          { fromDate, toDate },
        );

        this.logger.log(
          `Template créé: "${template.name}" avec ${result.generated} occurrence(s) initiale(s)`,
        );

        // Return template with generation info
        return {
          ...template,
          initialOccurrencesGenerated: result.generated,
        };
      } catch (error) {
        this.logger.error(
          `Erreur lors de la génération des occurrences initiales: ${error.message}`,
        );
        // Return template even if occurrence generation fails
        return {
          ...template,
          initialOccurrencesGenerated: 0,
          generationError: error.message,
        };
      }
    }

    return template;
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
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateTransportTemplateDto,
  ) {
    return this.templatesService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary:
      'Soft delete a transport template by setting isActive to false (ADMIN only)',
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
