import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '../auth/guards/auth.guards';
import { FormulaType } from '@prisma/client';

@ApiTags('Metadata')
@ApiBearerAuth()
@Controller('metadata')
export class MetadataController {
  @Get('formulas')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Get list of available formula types' })
  @ApiResponse({
    status: 200,
    description: 'Formula types retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: { type: 'string', enum: ['MORNING', 'AFTERNOON', 'FULL'] },
        },
      },
    },
  })
  getFormulas() {
    return {
      items: Object.values(FormulaType),
    };
  }
}
