import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { BookingsQueryDto } from './dto/bookings-query.dto';
import { Roles } from '../../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard)
@Controller('driver/bookings')
export class DriverBookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Roles('driver', 'admin', 'moderator')
  @Get()
  myDriver(@CurrentUser() user: any, @Query() q: BookingsQueryDto) {
    return this.bookings.myAsDriver(user.sub ?? user.id, q);
  }
}
