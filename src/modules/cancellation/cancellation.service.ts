import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus, TripStatus } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { BookingsService } from '../bookings/bookings.service';
import { CancelBookingDto } from '../bookings/dto/cancel-booking.dto';

@Injectable()
export class CancellationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly bookings: BookingsService,
  ) {}

  async getQuote(bookingId: string, userId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { trip: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.passengerId !== userId) {
      throw new ForbiddenException('Not your booking');
    }

    if (
      booking.status !== BookingStatus.confirmed &&
      booking.status !== BookingStatus.paid
    ) {
      throw new BadRequestException('Booking cannot be canceled');
    }
    if (
      booking.trip.status === TripStatus.started ||
      booking.trip.status === TripStatus.completed
    ) {
      throw new BadRequestException('Trip already started/completed');
    }

    const feePercent = this.getCancelFeePercent();
    const feeAmount = Math.round((booking.price * feePercent) / 100);
    const refundAmount = Math.max(0, booking.price - feeAmount);

    return {
      bookingId: booking.id,
      tripId: booking.tripId,
      price: booking.price,
      currency: booking.currency,
      feePercent,
      feeAmount,
      refundAmount,
    };
  }

  async applyPassengerCancellation(
    bookingId: string,
    userId: string,
    dto: CancelBookingDto,
  ) {
    return this.bookings.cancelAsPassenger(bookingId, userId, dto);
  }

  private getCancelFeePercent() {
    const raw = Number(this.config.get('bookings.cancelFeePercent') ?? 10);
    if (Number.isNaN(raw)) return 10;
    return Math.min(100, Math.max(0, raw));
  }
}
