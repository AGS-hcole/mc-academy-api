// src/sites/sites.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { SitesService } from './sites.service';
import { CreateSiteDto, UpdateSiteDto } from './dto';

@ApiTags('sites')
@Controller('sites')
export class SitesController {
  constructor(private readonly sitesService: SitesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all sites' })
  @ApiResponse({ status: 200, description: 'List of all sites' })
  async findAll() {
    return this.sitesService.findAll();
  }

  @Get('active')
  @ApiOperation({ summary: 'Get active sites only' })
  @ApiResponse({ status: 200, description: 'List of active sites' })
  async findActive() {
    return this.sitesService.findActive();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get site by ID' })
  @ApiResponse({ status: 200, description: 'Site details' })
  @ApiResponse({ status: 404, description: 'Site not found' })
  async findOne(@Param('id') id: string) {
    return this.sitesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new site (admin only)' })
  @ApiBody({ type: CreateSiteDto })
  @ApiResponse({ status: 201, description: 'Site created successfully' })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data or duplicate name',
  })
  // @UseGuards(AdminGuard) // Uncomment when admin guard is available
  async create(@Body() dto: CreateSiteDto) {
    return this.sitesService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a site (admin only)' })
  @ApiBody({ type: UpdateSiteDto })
  @ApiResponse({ status: 200, description: 'Site updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 404, description: 'Site not found' })
  // @UseGuards(AdminGuard) // Uncomment when admin guard is available
  async update(@Param('id') id: string, @Body() dto: UpdateSiteDto) {
    return this.sitesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a site (admin only)' })
  @ApiResponse({ status: 200, description: 'Site deleted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot delete site with sessions' })
  @ApiResponse({ status: 404, description: 'Site not found' })
  // @UseGuards(AdminGuard) // Uncomment when admin guard is available
  async remove(@Param('id') id: string) {
    return this.sitesService.remove(id);
  }
}
