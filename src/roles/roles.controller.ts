import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ValidRoles } from '../auth/interfaces/valid-roles';
import { AuthGuard } from 'src/auth/guards/auth.guards';

@ApiTags('Roles')
@Controller('roles')
export class RolesController {
  @Get()
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: 'Get available roles',
    description: 'Returns a list of all available user roles in the system',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved available roles',
    schema: {
      type: 'array',
      items: {
        type: 'string',
        enum: ['admin', 'user', 'parent'],
      },
      example: ['admin', 'user', 'parent'],
    },
  })
  async getRoles() {
    return Object.values(ValidRoles);
  }
}
