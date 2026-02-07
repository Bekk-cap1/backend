import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types/auth-user';
import { CancelBookingDto } from '../bookings/dto/cancel-booking.dto';
import { CancellationService } from './cancellation.service';

@Controller('cancellations')
export class CancellationController {
  constructor(private readonly cancellations: CancellationService) {}

  @Get('bookings/:bookingId/quote')
  quote(@CurrentUser() user: AuthUser, @Param('bookingId') bookingId: string) {
    return this.cancellations.getQuote(bookingId, user.sub);
  }

  @Post('bookings/:bookingId/apply')
  apply(
    @CurrentUser() user: AuthUser,
    @Param('bookingId') bookingId: string,
    @Body() dto: CancelBookingDto,
  ) {
    return this.cancellations.applyPassengerCancellation(
      bookingId,
      user.sub,
      dto,
    );
  }
}
