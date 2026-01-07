import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BookingStatus,
  PaymentStatus,
  Prisma,
  TripStatus,
  RequestStatus,
} from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { BookingsQueryDto } from './dto/bookings-query.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';

const cancellableStatuses: BookingStatus[] = [
  BookingStatus.confirmed,
  BookingStatus.paid,
];

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private getCancelFeePercent() {
    const raw = Number(this.config.get('bookings.cancelFeePercent') ?? 10);
    if (Number.isNaN(raw)) return 10;
    return Math.min(100, Math.max(0, raw));
  }

  // Пассажир: мои брони
  async myAsPassenger(userId: string, q: BookingsQueryDto) {
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;

    const where: Prisma.BookingWhereInput = {
      passengerId: userId,
      ...(q.status ? { status: q.status } : {}),
      ...(q.tripId ? { tripId: q.tripId } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.booking.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          trip: {
            include: {
              fromCity: true,
              toCity: true,
              driver: { select: { id: true, phone: true } },
            },
          },
          request: true,
          payments: true,
        },
      }),
      this.prisma.booking.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  // Водитель: брони по моим поездкам
  async myAsDriver(driverId: string, q: BookingsQueryDto) {
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;

    const where: Prisma.BookingWhereInput = {
      trip: { driverId },
      ...(q.status ? { status: q.status } : {}),
      ...(q.tripId ? { tripId: q.tripId } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.booking.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          trip: { include: { fromCity: true, toCity: true } },
          passenger: { select: { id: true, phone: true, profile: true } },
          request: true,
          payments: true,
        },
      }),
      this.prisma.booking.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  // Детали брони (для владельца-пассажира или водителя поездки)
  async getByIdForUser(bookingId: string, userId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        trip: {
          include: {
            fromCity: true,
            toCity: true,
            driver: { select: { id: true, phone: true } },
          },
        },
        passenger: { select: { id: true, phone: true, profile: true } },
        request: true,
        payments: true,
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    const isPassenger = booking.passengerId === userId;
    const isDriver = booking.trip.driverId === userId;
    if (!isPassenger && !isDriver)
      throw new ForbiddenException('No access to this booking');

    return booking;
  }

  /**
   * Отмена брони пассажиром:
   * - booking.status must be confirmed
   * - trip not started/completed (по правилам можно расширить)
   * - seats возвращаем в Trip
   */
  async cancelAsPassenger(
    bookingId: string,
    userId: string,
    dto: CancelBookingDto,
  ) {
    return this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const booking = await tx.booking.findUnique({
          where: { id: bookingId },
          include: { trip: true, request: true },
        });
        if (!booking) throw new NotFoundException('Booking not found');
        if (booking.passengerId !== userId)
          throw new ForbiddenException('Not your booking');

        if (booking.status === BookingStatus.canceled) return booking; // идемпотентно
        if (!cancellableStatuses.includes(booking.status)) {
          throw new BadRequestException(
            'Only confirmed booking can be canceled',
          );
        }

        // правило продукта: если поездка уже started/completed — нельзя отменять
        const s = booking.trip.status;

        if (s === TripStatus.started || s === TripStatus.completed) {
          throw new BadRequestException('Trip already started/completed');
        }

        const cancelFeePercent = this.getCancelFeePercent();
        const cancellationFeeAmount = Math.round(
          (booking.price * cancelFeePercent) / 100,
        );
        const refundAmount = Math.max(0, booking.price - cancellationFeeAmount);

        const updated = await tx.booking.update({
          where: { id: bookingId },
          data: {
            status: BookingStatus.canceled,
            canceledAt: new Date(),
            cancellationFeeAmount,
            // если хочешь хранить reason — добавим поле cancelReason позже в схему
          },
        });

        // возвращаем места
        await tx.trip.update({
          where: { id: booking.tripId },
          data: { seatsAvailable: { increment: booking.seats } },
        });

        // request можно пометить canceled (если статус accepted)
        await tx.tripRequest.update({
          where: { id: booking.requestId },
          data: {
            status: RequestStatus.canceled,
            respondedAt: new Date(),
            rejectionReason: dto.reason ?? null,
          },
        });

        if (booking.status === BookingStatus.paid) {
          await tx.payment.updateMany({
            where: {
              bookingId: booking.id,
              status: { in: [PaymentStatus.paid, PaymentStatus.refunded] },
            },
            data: {
              refundedAmount: refundAmount,
              refundedAt: refundAmount > 0 ? new Date() : undefined,
            },
          });
        }

        return updated;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  /**
   * Отмена брони водителем:
   * - проверка что водитель владеет поездкой
   * - статус confirmed
   */
  async cancelAsDriver(
    bookingId: string,
    driverId: string,
    dto: CancelBookingDto,
  ) {
    return this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const booking = await tx.booking.findUnique({
          where: { id: bookingId },
          include: { trip: true, request: true },
        });
        if (!booking) throw new NotFoundException('Booking not found');
        if (booking.trip.driverId !== driverId)
          throw new ForbiddenException('Not your trip booking');

        if (booking.status === BookingStatus.canceled) return booking;
        if (!cancellableStatuses.includes(booking.status)) {
          throw new BadRequestException(
            'Only confirmed booking can be canceled',
          );
        }

        // можно разрешить отмену и после started — зависит от продукта.
        // пока строгий вариант:
        if (booking.trip.status === TripStatus.completed) {
          throw new BadRequestException('Trip already completed');
        }

        const updated = await tx.booking.update({
          where: { id: bookingId },
          data: {
            status: BookingStatus.canceled,
            canceledAt: new Date(),
            cancellationFeeAmount: 0,
          },
        });

        await tx.trip.update({
          where: { id: booking.tripId },
          data: { seatsAvailable: { increment: booking.seats } },
        });

        await tx.tripRequest.update({
          where: { id: booking.requestId },
          data: {
            status: 'canceled',
            respondedAt: new Date(),
            rejectionReason: dto.reason ?? null,
          },
        });

        return updated;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  /**
   * Завершение брони:
   * - обычно триггерится завершением Trip
   * - либо подтверждение обеих сторон (это уже следующий уровень, можно добавить later)
   */
  async complete(bookingId: string, userId: string) {
    return this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const booking = await tx.booking.findUnique({
          where: { id: bookingId },
          include: { trip: true },
        });
        if (!booking) throw new NotFoundException('Booking not found');

        const isPassenger = booking.passengerId === userId;
        const isDriver = booking.trip.driverId === userId;
        if (!isPassenger && !isDriver)
          throw new ForbiddenException('No access');

        if (booking.status === BookingStatus.completed) return booking;
        if (!cancellableStatuses.includes(booking.status)) {
          throw new BadRequestException(
            'Only confirmed booking can be completed',
          );
        }

        // строгий вариант: trip должен быть completed
        if (booking.trip.status !== TripStatus.completed) {
          throw new BadRequestException('Trip is not completed yet');
        }

        return tx.booking.update({
          where: { id: bookingId },
          data: { status: BookingStatus.completed, completedAt: new Date() },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
}
