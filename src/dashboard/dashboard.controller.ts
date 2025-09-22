import { Controller, Get, UseGuards } from '@nestjs/common';
import { UserService } from 'src/user/user.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/guards/auth.guards';

@ApiBearerAuth()
@ApiTags('Dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly _userService: UserService) {}

  @UseGuards(AuthGuard)
  @Get()
  async getDashboard() {
    const users = await this._userService.findAll();

    return {
      usersCount: users.length,
    };
  }
}
