import {
  Controller,
  ForbiddenException,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserService } from 'src/user/user.service';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/guards/auth.guards';
import { AdminGuard } from 'src/auth/guards/admin.guard';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { User } from 'src/user/entities/user.entity';
import { AdminDashboardService } from './admin-dashboard.service';
import { ParentDashboardService } from './parent-dashboard.service';
import { AdminDashboardQueryDto } from './dto/admin-dashboard-query.dto';
import { AdminDashboardResponseDto } from './dto/admin-dashboard-response.dto';
import { ParentDashboardQueryDto } from './dto/parent-dashboard-query.dto';
import { ParentDashboardResponseDto } from './dto/parent-dashboard-response.dto';

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
    summary: 'Get dashboard statistics for the connected parent children',
    description:
      'Returns, for each child linked to the connected parent, statistics over a given period: ' +
      'completed training sessions, average training rating, completed transports, nights stayed, ' +
      'and tournaments completed/upcoming.',
  })
  async getParentDashboard(
    @GetUser() user: User,
    @Query() query: ParentDashboardQueryDto,
  ): Promise<ParentDashboardResponseDto> {
    if (user.role !== 'parent') {
      throw new ForbiddenException('Parent access required');
    }

    return this.parentDashboardService.getChildrenDashboard(
      user.id,
      query.from,
      query.to,
    );
  }
}
