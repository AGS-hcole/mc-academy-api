import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TransportTemplatesService } from './transport-templates.service';
import { CreateTransportTemplateDto, UpdateTransportTemplateDto } from './dto';
import { AdminGuard } from '../auth/guards/admin.guard';

@ApiTags('Transport Templates')
@Controller('transport/templates')
@UseGuards(AdminGuard)
@ApiBearerAuth()
export class TransportTemplatesController {
  constructor(
    private readonly transportTemplatesService: TransportTemplatesService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Create a transport template',
    description: 'Admin only: Create a new transport template (traject type).',
  })
  create(@Body() createDto: CreateTransportTemplateDto) {
    return this.transportTemplatesService.create(createDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all transport templates',
    description: 'Admin only: Retrieve all transport templates.',
  })
  findAll() {
    return this.transportTemplatesService.findAll();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a transport template by ID',
    description: 'Admin only: Retrieve a single transport template.',
  })
  findOne(@Param('id') id: string) {
    return this.transportTemplatesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a transport template',
    description: 'Admin only: Update an existing transport template.',
  })
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateTransportTemplateDto,
  ) {
    return this.transportTemplatesService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a transport template',
    description: 'Admin only: Delete a transport template.',
  })
  remove(@Param('id') id: string) {
    return this.transportTemplatesService.remove(id);
  }
}
