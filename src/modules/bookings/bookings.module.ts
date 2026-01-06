import { Module } from '@nestjs/common';
import { BookingsController } from './bookings.controller';
import { DriverBookingsController } from './driver-bookings.controller';
import { BookingsService } from './bookings.service';

@Module({
  controllers: [BookingsController, DriverBookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
