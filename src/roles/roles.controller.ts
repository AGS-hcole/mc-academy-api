import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ValidRoles } from '../auth/interfaces/valid-roles';

@ApiTags('Roles')
@Controller('roles')
export class RolesController {
  @Get()
  @ApiOperation({ 
    summary: 'Get available roles',
    description: 'Returns a list of all available user roles in the system'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Successfully retrieved available roles',
    schema: {
      type: 'array',
      items: {
        type: 'string',
        enum: ['admin', 'user']
      },
      example: ['admin', 'user']
    }
  })
  async getRoles() {
    return Object.values(ValidRoles);
  }
}
