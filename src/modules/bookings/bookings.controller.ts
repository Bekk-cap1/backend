import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { BookingsQueryDto } from './dto/bookings-query.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthUser } from '../../common/types/auth-user';

@UseGuards(JwtAuthGuard)
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  // passenger
  @Get('me')
  my(@CurrentUser() user: AuthUser, @Query() q: BookingsQueryDto) {
    return this.bookings.myAsPassenger(user.sub, q);
  }

  @Get('my')
  myAlias(@CurrentUser() user: AuthUser, @Query() q: BookingsQueryDto) {
    return this.bookings.myAsPassenger(user.sub, q);
  }

  // driver
  @Roles('driver', 'admin', 'moderator')
  @Get('driver')
  myDriver(@CurrentUser() user: AuthUser, @Query() q: BookingsQueryDto) {
    return this.bookings.myAsDriver(user.sub, q);
  }

  @Get(':id')
  getOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.bookings.getByIdForUser(id, user.sub);
  }

  // passenger cancels
  @Post(':id/cancel')
  cancel(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CancelBookingDto,
  ) {
    return this.bookings.cancelAsPassenger(id, user.sub, dto);
  }

  // driver cancels
  @Roles('driver', 'admin', 'moderator')
  @Post(':id/cancel-by-driver')
  cancelByDriver(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CancelBookingDto,
  ) {
    return this.bookings.cancelAsDriver(id, user.sub, dto);
  }

  @Post(':id/complete')
  complete(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.bookings.complete(id, user.sub);
  }
}
