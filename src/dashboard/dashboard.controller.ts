import {
  Controller,
  ForbiddenException,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserService } from 'src/user/user.service';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/guards/auth.guards';
import { AdminGuard } from 'src/auth/guards/admin.guard';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminDashboardQueryDto } from './dto/admin-dashboard-query.dto';
import { AdminDashboardResponseDto } from './dto/admin-dashboard-response.dto';
import { ParentDashboardService } from './parent-dashboard.service';
import { ParentDashboardQueryDto, ParentDashboardResponseDto } from './dto';
import { GetUser } from 'src/auth/decorators/get-user.decorator';

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

@ApiBearerAuth()
@ApiTags('Parent Dashboard')
@Controller('parent/dashboard')
@UseGuards(AuthGuard)
export class ParentDashboardController {
  constructor(
    private readonly parentDashboardService: ParentDashboardService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get parent dashboard by child and period (PARENT only)',
    description:
      'Returns dashboard metrics for each child linked to the authenticated parent over a date period.',
  })
  @ApiResponse({
    status: 200,
    description: 'Parent dashboard metrics grouped by child',
    type: ParentDashboardResponseDto,
  })
  async getParentDashboard(
    @GetUser() user: any,
    @Query() query: ParentDashboardQueryDto,
  ): Promise<ParentDashboardResponseDto> {
    if (user?.role !== 'parent') {
      throw new ForbiddenException('Parent access required');
    }

    return this.parentDashboardService.getParentDashboard(user.id, query);
  }
}
