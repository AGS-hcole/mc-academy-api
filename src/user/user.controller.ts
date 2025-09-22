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
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { User } from './entities/user.entity';
import { AuthGuard } from 'src/auth/guards/auth.guards';
import { GetUser } from 'src/auth/decorators/get-user.decorator';

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
}
