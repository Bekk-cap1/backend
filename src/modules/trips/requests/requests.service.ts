import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import {
  BookingStatus,
  NegotiationSessionState,
  NegotiationTurn,
  OfferStatus,
  Role,
  RequestStatus,
  TripStatus,
} from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { OutboxService } from '../../../outbox/outbox.service';
import { OutboxTopic } from '../../../outbox/outbox.topics';
import { DriversService } from '../../drivers/drivers.service';

@Injectable()
export class RequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
    private readonly drivers: DriversService,
    private readonly config: ConfigService,
  ) {}

  private getNegotiationLimits() {
    const maxDriverOffers = this.config.get<number>('negotiation.maxDriverOffers') ?? 3;
    const maxPassengerOffers = this.config.get<number>('negotiation.maxPassengerOffers') ?? 3;
    return {
      maxDriverOffers,
      maxPassengerOffers,
      maxPerSide: Math.max(maxDriverOffers, maxPassengerOffers),
    };
  }

  async listMyRequests(passengerId: string) {
    return this.prisma.tripRequest.findMany({
      where: { passengerId },
      orderBy: { createdAt: 'desc' },
      include: {
        trip: {
          include: {
            fromCity: true,
            toCity: true,
            driver: { select: { id: true, phone: true, profile: true } },
          },
        },
        booking: true,
        offers: { orderBy: { createdAt: 'desc' } },
      },
    });
  }

  async listDriverRequests(driverId: string, role: Role) {
    if (role === Role.driver) {
      await this.drivers.assertVerifiedDriver(driverId);
    }
    return this.prisma.tripRequest.findMany({
      where: { trip: { driverId } },
      orderBy: { createdAt: 'desc' },
      include: {
        passenger: { select: { id: true, phone: true, profile: true } },
        trip: { include: { fromCity: true, toCity: true } },
        booking: true,
        offers: { orderBy: { createdAt: 'desc' } },
      },
    });
  }

  async getMyRequest(passengerId: string, tripId: string) {
    return this.prisma.tripRequest.findUnique({
      where: { tripId_passengerId: { tripId, passengerId } },
      include: { booking: true },
    });
  }

  async getNegotiationSession(userId: string, role: Role, requestId: string) {
    const request = await this.prisma.tripRequest.findUnique({
      where: { id: requestId },
      include: { trip: { select: { driverId: true } } },
    });
    if (!request) throw new NotFoundException('Trip request not found');

    const isPassenger = request.passengerId === userId;
    const isDriver = request.trip.driverId === userId;

    if (!isPassenger && !isDriver) {
      throw new ForbiddenException('Not allowed for this request');
    }
    if (role === Role.passenger && !isPassenger) {
      throw new ForbiddenException('Passenger cannot access чужой request');
    }
    if (role === Role.driver && !isDriver) {
      throw new ForbiddenException('Driver cannot access чужой request');
    }

    const session = await this.ensureNegotiationSession(requestId);
    const lastOffer = session.lastOfferId
      ? await this.prisma.offer.findUnique({ where: { id: session.lastOfferId } })
      : null;

    const driverAttemptsUsed = await this.prisma.offer.count({
      where: { requestId, proposerRole: Role.driver },
    });
    const passengerAttemptsUsed = await this.prisma.offer.count({
      where: { requestId, proposerRole: Role.passenger },
    });
    const maxDriverOffers = driverAttemptsUsed + session.driverMovesLeft;
    const maxPassengerOffers = passengerAttemptsUsed + session.passengerMovesLeft;

    return {
      requestId,
      state: session.state,
      nextTurn: session.nextTurn,
      driverMovesLeft: session.driverMovesLeft,
      passengerMovesLeft: session.passengerMovesLeft,
      maxMovesPerSide: session.maxMovesPerSide,
      maxDriverOffers,
      maxPassengerOffers,
      lastOffer,
      version: session.version,
    };
  }

  private async ensureNegotiationSession(requestId: string) {
    const existing = await this.prisma.negotiationSession.findUnique({ where: { requestId } });
    if (existing) return existing;

    const limits = this.getNegotiationLimits();

    try {
      return await this.prisma.negotiationSession.create({
        data: {
          requestId,
          state: NegotiationSessionState.active,
          nextTurn: NegotiationTurn.driver,
          driverMovesLeft: limits.maxDriverOffers,
          passengerMovesLeft: limits.maxPassengerOffers,
          maxMovesPerSide: limits.maxPerSide,
          lastOfferId: null,
          version: 0,
        },
      });
    } catch (error: any) {
      if (String(error?.code) === 'P2002') {
        return this.prisma.negotiationSession.findUniqueOrThrow({ where: { requestId } });
      }
      throw error;
    }
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
        const limits = this.getNegotiationLimits();

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

        await tx.negotiationSession.create({
          data: {
            requestId: req.id,
            state: NegotiationSessionState.active,
            nextTurn: NegotiationTurn.driver,
            driverMovesLeft: limits.maxDriverOffers,
            passengerMovesLeft: limits.maxPassengerOffers,
            maxMovesPerSide: limits.maxPerSide,
            lastOfferId: null,
            version: 0,
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
  async acceptRequest(actorId: string, role: Role, tripId: string, requestId: string) {
    if (role === Role.driver) {
      await this.drivers.assertVerifiedDriver(actorId);
    }
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
          status: OfferStatus.active,
        },
        data: {
          status: OfferStatus.canceled,
          respondedAt: new Date(),
          responseReason: 'Request accepted; active offers canceled',
        },
      });

      await tx.negotiationSession.updateMany({
        where: { requestId: updatedReq.id },
        data: { state: NegotiationSessionState.accepted, lastOfferId: null },
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

  async rejectRequest(actorId: string, role: Role, tripId: string, requestId: string, reason?: string) {
    if (role === Role.driver) {
      await this.drivers.assertVerifiedDriver(actorId);
    }
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
        where: { requestId: updated.id, status: OfferStatus.active },
        data: {
          status: OfferStatus.canceled,
          respondedAt: new Date(),
          responseReason: 'Request rejected; active offers canceled',
        },
      });

      await tx.negotiationSession.updateMany({
        where: { requestId: updated.id },
        data: { state: NegotiationSessionState.canceled, lastOfferId: null },
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

  async cancelRequest(passengerId: string, requestId: string) {
    return this.prisma.$transaction(async (tx) => {
      const req = await tx.tripRequest.findUnique({
        where: { id: requestId },
      });
      if (!req) throw new NotFoundException('Request not found');
      if (req.passengerId !== passengerId) {
        throw new ForbiddenException('Only request owner can cancel');
      }

      if (req.status !== RequestStatus.pending) {
        throw new BadRequestException('Only pending request can be canceled');
      }

      const updated = await tx.tripRequest.update({
        where: { id: requestId },
        data: {
          status: RequestStatus.canceled,
          respondedAt: new Date(),
          rejectionReason: null,
        },
      });

      await tx.offer.updateMany({
        where: { requestId: updated.id, status: OfferStatus.active },
        data: {
          status: OfferStatus.canceled,
          respondedAt: new Date(),
          responseReason: 'Request canceled by passenger',
        },
      });

      await tx.negotiationSession.updateMany({
        where: { requestId: updated.id },
        data: { state: NegotiationSessionState.canceled, lastOfferId: null },
      });

      await this.outbox.enqueueTx(tx, {
        topic: OutboxTopic.RequestCanceled,
        aggregateType: 'TripRequest',
        aggregateId: updated.id,
        payload: {
          requestId: updated.id,
          tripId: updated.tripId,
          passengerId: updated.passengerId,
        },
        idempotencyKey: `request.canceled:${updated.id}`,
      });

      return { ok: true, request: updated };
    });
  }
}
