import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ValidRoles } from '../auth/interfaces/valid-roles';

@ApiTags('Roles')
@Controller('roles')
export class RolesController {
  @Get()
  async getRoles() {
    return Object.values(ValidRoles);
  }
}
