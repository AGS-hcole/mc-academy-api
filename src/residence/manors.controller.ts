import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseBoolPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ManorsService } from './manors.service';
import { CreateManorDto, UpdateManorDto } from './dto';
import { AdminGuard } from '../auth/guards/admin.guard';
import { AuthGuard } from 'src/auth/guards/auth.guards';

@ApiTags('residence/manors')
@ApiBearerAuth()
@Controller('residence/manors')
export class ManorsController {
  constructor(private readonly manorsService: ManorsService) {}

  @Get()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Get all manors (All users)' })
  @ApiQuery({
    name: 'activeOnly',
    required: false,
    type: Boolean,
    description: 'Filter by active status',
  })
  @ApiResponse({ status: 200, description: 'List of manors' })
  async findAll(
    @Query('activeOnly', new ParseBoolPipe({ optional: true }))
    activeOnly?: boolean,
  ) {
    const resolvedActiveOnly = activeOnly ?? true;

    // Optionnel (si tu veux empêcher les users de voir les inactifs)
    // if (resolvedActiveOnly === false && !user.isAdmin) {
    //   throw new ForbiddenException();
    // }

    return this.manorsService.findAll(resolvedActiveOnly);
  }

  @Get(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Get manor by ID (Admin only)' })
  @ApiResponse({ status: 200, description: 'Manor found' })
  @ApiResponse({ status: 404, description: 'Manor not found' })
  async findOne(@Param('id') id: string) {
    return this.manorsService.findOne(id);
  }

  @Post()
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Create a new manor (Admin only)' })
  @ApiResponse({ status: 201, description: 'Manor created' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async create(@Body() dto: CreateManorDto) {
    return this.manorsService.create(dto);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Update manor (Admin only)' })
  @ApiResponse({ status: 200, description: 'Manor updated' })
  @ApiResponse({ status: 404, description: 'Manor not found' })
  async update(@Param('id') id: string, @Body() dto: UpdateManorDto) {
    return this.manorsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Soft delete manor (Admin only)' })
  @ApiResponse({ status: 200, description: 'Manor deleted (set to inactive)' })
  @ApiResponse({ status: 404, description: 'Manor not found' })
  async delete(@Param('id') id: string) {
    return this.manorsService.delete(id);
  }
}
