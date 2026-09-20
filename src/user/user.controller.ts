import {
  Controller,
  ForbiddenException,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  ApiBearerAuth,
  ApiTags,
  ApiQuery,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import { User } from './entities/user.entity';
import { AuthGuard } from 'src/auth/guards/auth.guards';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { AdminGuard } from 'src/auth/guards/admin.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { RolesGuard } from 'src/auth/guards/roles.guard';

@ApiBearerAuth()
@ApiTags('Users')
@Controller('users')
export class UserController {
  /**
   * Constructor
   */
  constructor(private readonly userService: UserService) {}

  // -----------------------------------------------------------------------------------------------------
  // @ Auth Endpoints
  // -----------------------------------------------------------------------------------------------------
  @Post()
  @UseGuards(AuthGuard)
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Get()
  @UseGuards(AuthGuard)
  getAll() {
    return this.userService.findAll();
  }

  @Get('lookup')
  @UseGuards(RolesGuard)
  @Roles(Role.admin, Role.parent)
  @ApiOperation({ summary: 'Lookup users with filters (Admin only)' })
  @ApiQuery({ name: 'role', required: false, description: 'Filter by role' })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search by name or email',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number',
  })
  @ApiQuery({
    name: 'pageSize',
    required: false,
    type: Number,
    description: 'Page size',
  })
  lookup(
    @Query('role') role?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.userService.lookup({
      role,
      search,
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 20,
    });
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  getById(@Param('id') id: string) {
    return this.userService.getById(id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(id, updateUserDto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  delete(@Param('id') id: string, @GetUser() user: User) {
    return this.userService.delete(id, user);
  }

  @Post(':id/players/:playerId')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Associate a child user to a parent user (Admin only, legacy route name)',
  })
  @ApiParam({ name: 'id', description: 'Parent user ID' })
  @ApiParam({ name: 'playerId', description: 'Child user ID' })
  addPlayerToParent(
    @Param('id') id: string,
    @Param('playerId') playerId: string,
  ) {
    return this.userService.addPlayerToParent(id, playerId);
  }

  @Delete(':id/players/:playerId')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Remove a child user association from a parent user (Admin only, legacy route name)',
  })
  @ApiParam({ name: 'id', description: 'Parent user ID' })
  @ApiParam({ name: 'playerId', description: 'Child user ID' })
  removePlayerFromParent(
    @Param('id') id: string,
    @Param('playerId') playerId: string,
  ) {
    return this.userService.removePlayerFromParent(id, playerId);
  }
}

@ApiBearerAuth()
@ApiTags('Parent')
@Controller('parent')
export class ParentChildrenController {
  constructor(private readonly userService: UserService) {}

  @Get('children')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: "Get current parent's linked children" })
  async getChildren(@GetUser() user: any) {
    if (user?.role !== 'parent') {
      throw new ForbiddenException('Parent access required');
    }

    return this.userService.getChildrenBrief(user.id);
  }
}
