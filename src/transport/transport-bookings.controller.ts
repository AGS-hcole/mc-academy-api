import { Controller, Post, Param, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { TransportBookingsService } from './transport-bookings.service';
import { AuthGuard } from '../auth/guards/auth.guards';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '@prisma/client';

@ApiTags('transport-bookings')
@ApiBearerAuth()
@Controller('transport-bookings')
@UseGuards(AuthGuard)
export class TransportBookingsController {
  constructor(private readonly bookingsService: TransportBookingsService) {}

  @Post(':id/cancel')
  @ApiOperation({
    summary: 'Cancel a transport booking (AUTH required)',
    description: 'Users can cancel their own bookings. Admins can cancel any booking.',
  })
  @ApiResponse({ status: 200, description: 'Booking cancelled successfully' })
  @ApiResponse({ status: 403, description: 'Not authorized to cancel this booking' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  cancel(@Param('id') id: string, @GetUser() user: User) {
    const isAdmin = user.role === 'admin';
    return this.bookingsService.cancel(id, user.id, isAdmin);
  }
}
