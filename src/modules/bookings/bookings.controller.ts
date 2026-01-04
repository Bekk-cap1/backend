import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { BookingsQueryDto } from './dto/bookings-query.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { Roles } from '../../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard)
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  // passenger
  @Get('me')
  my(@CurrentUser() user: any, @Query() q: BookingsQueryDto) {
    return this.bookings.myAsPassenger(user.sub ?? user.id, q);
  }

  // driver
  @Roles('driver', 'admin')
  @Get('driver')
  myDriver(@CurrentUser() user: any, @Query() q: BookingsQueryDto) {
    return this.bookings.myAsDriver(user.sub ?? user.id, q);
  }

  @Get(':id')
  getOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.bookings.getByIdForUser(id, user.sub ?? user.id);
  }

  // passenger cancels
  @Post(':id/cancel')
  cancel(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: CancelBookingDto) {
    return this.bookings.cancelAsPassenger(id, user.sub ?? user.id, dto);
  }

  // driver cancels
  @Roles('driver', 'admin')
  @Post(':id/cancel-by-driver')
  cancelByDriver(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: CancelBookingDto) {
    return this.bookings.cancelAsDriver(id, user.sub ?? user.id, dto);
  }

  @Post(':id/complete')
  complete(@CurrentUser() user: any, @Param('id') id: string) {
    return this.bookings.complete(id, user.sub ?? user.id);
  }
}
