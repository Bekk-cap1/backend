import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { BookingStatus, RequestStatus, TripStatus } from '@prisma/client';
import { OutboxService } from '../../../outbox/outbox.service';
import { OutboxTopic } from '../../../outbox/outbox.topics';

@Injectable()
export class RequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
  ) {}

  async getMyRequest(passengerId: string, tripId: string) {
    return this.prisma.tripRequest.findUnique({
      where: { tripId_passengerId: { tripId, passengerId } },
      include: { booking: true },
    });
  }

  async createRequest(passengerId: string, tripId: string, dto: { seats: number; price: number; currency: string; message?: string }) {
    const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw new NotFoundException('Trip not found');

    if (trip.status !== TripStatus.published) {
      throw new BadRequestException('Trip is not available for requests');
    }

    if (dto.seats > trip.seatsAvailable) {
      throw new BadRequestException('Not enough seats available');
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const req = await tx.tripRequest.create({
          data: {
            tripId,
            passengerId,
            seats: dto.seats,
            price: dto.price,
            currency: dto.currency,
            message: dto.message ?? null,
            status: RequestStatus.pending,
          },
        });

        await this.outbox.enqueueTx(tx, {
          topic: OutboxTopic.RequestCreated,
          aggregateType: 'TripRequest',
          aggregateId: req.id,
          payload: { tripId, passengerId, seats: dto.seats },
          idempotencyKey: `request.created:${req.id}`,
        });

        return req;
      });
    } catch (e: any) {
      // уникальность @@unique([tripId, passengerId])
      if (String(e?.code) === 'P2002') {
        throw new BadRequestException('Request already exists for this trip');
      }
      throw e;
    }
  }

  /**
   * Принимает водитель (владелец trip) или админ.
   * Делает:
   * - request.status=accepted
   * - booking.create
   * - trip.seatsAvailable -= request.seats (атомарно)
   */
  async acceptRequest(actorId: string, tripId: string, requestId: string) {
    return this.prisma.$transaction(async (tx) => {
      const trip = await tx.trip.findUnique({ where: { id: tripId } });
      if (!trip) throw new NotFoundException('Trip not found');

      // Владелец поездки может принимать заявки; админ — тоже (если нужно расширить: проверяй роль в guard)
      if (trip.driverId !== actorId) {
        throw new ForbiddenException('Only trip driver can accept requests');
      }

      if (trip.status !== TripStatus.published) {
        throw new BadRequestException('Trip is not accepting requests');
      }

      const req = await tx.tripRequest.findUnique({
        where: { id: requestId },
      });
      if (!req || req.tripId !== tripId) throw new NotFoundException('Request not found');

      if (req.status !== RequestStatus.pending) {
        throw new BadRequestException('Request is not pending');
      }

      if (req.seats > trip.seatsAvailable) {
        throw new BadRequestException('Not enough seats available');
      }

      // атомарное списание мест: через update с условием
      const tripUpd = await tx.trip.updateMany({
        where: { id: tripId, seatsAvailable: { gte: req.seats } },
        data: { seatsAvailable: { decrement: req.seats } },
      });
      if (tripUpd.count !== 1) throw new BadRequestException('Seats race condition, retry');

      const updatedReq = await tx.tripRequest.update({
        where: { id: requestId },
        data: { status: RequestStatus.accepted, respondedAt: new Date(), rejectionReason: null },
      });

      const booking = await tx.booking.create({
        data: {
          requestId: updatedReq.id,
          tripId: tripId,
          passengerId: updatedReq.passengerId,
          seats: updatedReq.seats,
          price: updatedReq.price,
          currency: updatedReq.currency,
          status: BookingStatus.confirmed,
        },
      });

      // На практике: отменить/закрыть офферы по этой заявке (если у тебя есть offers на request)
      await tx.offer.updateMany({
        where: {
          requestId: updatedReq.id,
          status: { in: ['pending'] as any },
        },
        data: {
          status: 'canceled' as any,
          respondedAt: new Date(),
          responseReason: 'Request accepted; pending offers canceled' as any,
        },
      });

      await this.outbox.enqueueTx(tx, {
        topic: OutboxTopic.RequestAccepted,
        aggregateType: 'TripRequest',
        aggregateId: updatedReq.id,
        payload: { tripId, requestId: updatedReq.id, bookingId: booking.id },
        idempotencyKey: `request.accepted:${updatedReq.id}`,
      });

      return { ok: true, request: updatedReq, booking };
    });
  }

  async rejectRequest(actorId: string, tripId: string, requestId: string, reason?: string) {
    return this.prisma.$transaction(async (tx) => {
      const trip = await tx.trip.findUnique({ where: { id: tripId } });
      if (!trip) throw new NotFoundException('Trip not found');
      if (trip.driverId !== actorId) throw new ForbiddenException('Only trip driver can reject requests');

      const req = await tx.tripRequest.findUnique({ where: { id: requestId } });
      if (!req || req.tripId !== tripId) throw new NotFoundException('Request not found');

      if (req.status !== RequestStatus.pending) {
        throw new BadRequestException('Request is not pending');
      }

      const updated = await tx.tripRequest.update({
        where: { id: requestId },
        data: {
          status: RequestStatus.rejected,
          respondedAt: new Date(),
          rejectionReason: reason ?? 'Rejected by driver',
        },
      });

      await tx.offer.updateMany({
        where: { requestId: updated.id, status: { in: ['pending'] as any } },
        data: {
          status: 'canceled' as any,
          respondedAt: new Date(),
          responseReason: 'Request rejected; pending offers canceled' as any,
        },
      });

      await this.outbox.enqueueTx(tx, {
        topic: OutboxTopic.RequestRejected,
        aggregateType: 'TripRequest',
        aggregateId: updated.id,
        payload: { tripId, requestId: updated.id, reason: updated.rejectionReason },
        idempotencyKey: `request.rejected:${updated.id}`,
      });

      return { ok: true, request: updated };
    });
  }
}
