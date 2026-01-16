import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { UserService } from 'src/user/user.service';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/guards/auth.guards';
import { AdminGuard } from 'src/auth/guards/admin.guard';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminDashboardQueryDto } from './dto/admin-dashboard-query.dto';
import { AdminDashboardResponseDto } from './dto/admin-dashboard-response.dto';

@ApiBearerAuth()
@ApiTags('Dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly _userService: UserService,
    private readonly adminDashboardService: AdminDashboardService,
  ) {}

  @UseGuards(AuthGuard)
  @Get()
  async getDashboard() {
    const users = await this._userService.findAll();

    return {
      usersCount: users.length,
    };
  }
}

@ApiBearerAuth()
@ApiTags('Admin Dashboard')
@Controller('admin/dashboard')
@UseGuards(AdminGuard)
export class AdminDashboardController {
  constructor(private readonly adminDashboardService: AdminDashboardService) {}

  @Get()
  @ApiOperation({
    summary: 'Get admin dashboard day view (ADMIN only)',
    description:
      'Returns aggregated data for a given day: training sessions, manor stays, and transport occurrences',
  })
  async getAdminDayView(
    @Query() query: AdminDashboardQueryDto,
  ): Promise<AdminDashboardResponseDto> {
    return this.adminDashboardService.getDayView(query.date);
  }
}
