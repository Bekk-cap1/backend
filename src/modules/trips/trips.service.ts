import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import {
    BookingStatus,
    OfferStatus,
    Prisma,
    RequestStatus,
    TripStatus,
} from '@prisma/client';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { DriversService } from '../drivers/drivers.service';

import { CreateTripDto } from './dto/create-trip.dto';
import { CreateTripRequestDto } from './dto/create-trip-request.dto';
import { RejectRequestDto } from './dto/reject-request.dto';
import { SearchTripsDto } from './dto/search-trips.dto';

import { AuditService } from '../../audit/audit.service';
import { AuditAction } from '../../audit/audit.actions';

import { OutboxService } from '../../outbox/outbox.service';
import { OutboxTopic } from '../../outbox/outbox.topics';

@Injectable()
export class TripsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly drivers: DriversService,
        private readonly audit: AuditService,
        private readonly outbox: OutboxService,
    ) { }

    private async assertVehicleOwnedByDriver(vehicleId: string, driverId: string) {
        const v = await this.prisma.vehicle.findFirst({
            where: { id: vehicleId, userId: driverId },
            select: { id: true },
        });
        if (!v) throw new ForbiddenException('Vehicle does not belong to driver');
    }

    // ---------------------------------------------------------------------------
    // TRIPS
    // ---------------------------------------------------------------------------

    async createTrip(driverId: string, dto: CreateTripDto) {
        await this.drivers.assertVerifiedDriver(driverId);

        const seatsTotal = dto.seatsTotal ?? 4;
        if (seatsTotal <= 0) throw new BadRequestException('seatsTotal must be > 0');
        if (dto.price <= 0) throw new BadRequestException('price must be > 0');

        if (dto.vehicleId) {
            await this.assertVehicleOwnedByDriver(dto.vehicleId, driverId);
        }

        const departureAt = new Date(dto.departureAt);
        if (Number.isNaN(departureAt.getTime())) throw new BadRequestException('Invalid departureAt');

        const arriveAt = dto.arriveAt ? new Date(dto.arriveAt) : null;
        if (dto.arriveAt && Number.isNaN(arriveAt!.getTime())) {
            throw new BadRequestException('Invalid arriveAt');
        }

        return this.prisma.$transaction(
            async (tx) => {
                const created = await tx.trip.create({
                    data: {
                        driverId,
                        fromCityId: dto.fromCityId,
                        toCityId: dto.toCityId,
                        vehicleId: dto.vehicleId ?? null,

                        departureAt,
                        arriveAt,

                        seatsTotal,
                        seatsAvailable: seatsTotal,

                        price: dto.price,
                        currency: dto.currency ?? 'UZS',

                        notes: dto.notes ?? null,
                        status: TripStatus.draft,
                    },
                });

                await this.audit.logTx(tx, {
                    action: AuditAction.TripCreate,
                    entityType: 'trip',
                    entityId: created.id,
                    severity: 'info',
                    metadata: {
                        driverId,
                        fromCityId: created.fromCityId,
                        toCityId: created.toCityId,
                        departureAt: created.departureAt,
                        arriveAt: created.arriveAt,
                        seatsTotal: created.seatsTotal,
                        price: created.price,
                        currency: created.currency,
                        vehicleId: created.vehicleId,
                    },
                });

                await this.outbox.enqueueTx(tx, {
                    topic: OutboxTopic.TripCreated,
                    aggregateType: 'trip',
                    aggregateId: created.id,
                    idempotencyKey: `trip:${created.id}:created`,
                    payload: {
                        tripId: created.id,
                        driverId,
                        status: created.status,
                        departureAt: created.departureAt,
                        fromCityId: created.fromCityId,
                        toCityId: created.toCityId,
                        price: created.price,
                        currency: created.currency,
                    },
                });

                return created;
            },
            { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
    }

    async publishTrip(driverId: string, tripId: string, notes?: string) {
        await this.drivers.assertVerifiedDriver(driverId);

        const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
        if (!trip) throw new NotFoundException('Trip not found');
        if (trip.driverId !== driverId) throw new ForbiddenException('Not your trip');

        if (trip.status !== TripStatus.draft) {
            throw new BadRequestException('Only draft trip can be published');
        }
        if (!trip.vehicleId) {
            throw new BadRequestException('Trip must have vehicleId before publishing');
        }
        if (trip.departureAt.getTime() <= Date.now()) {
            throw new BadRequestException('departureAt must be in the future');
        }

        return this.prisma.$transaction(
            async (tx) => {
                const updated = await tx.trip.update({
                    where: { id: tripId },
                    data: {
                        status: TripStatus.published,
                        notes: notes ?? trip.notes,
                    },
                });

                await this.audit.logTx(tx, {
                    action: AuditAction.TripPublish,
                    entityType: 'trip',
                    entityId: tripId,
                    severity: 'info',
                    metadata: {
                        fromStatus: TripStatus.draft,
                        toStatus: TripStatus.published,
                    },
                });

                await this.outbox.enqueueTx(tx, {
                    topic: OutboxTopic.TripPublished,
                    aggregateType: 'trip',
                    aggregateId: tripId,
                    idempotencyKey: `trip:${tripId}:published`,
                    payload: {
                        tripId,
                        driverId,
                        departureAt: updated.departureAt,
                        fromCityId: updated.fromCityId,
                        toCityId: updated.toCityId,
                        price: updated.price,
                        currency: updated.currency,
                    },
                });

                return updated;
            },
            { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
    }

    async startTrip(driverId: string, tripId: string) {
        await this.drivers.assertVerifiedDriver(driverId);

        const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
        if (!trip) throw new NotFoundException('Trip not found');
        if (trip.driverId !== driverId) throw new ForbiddenException('Not your trip');

        if (trip.status !== TripStatus.published) {
            throw new BadRequestException('Only published trip can be started');
        }

        return this.prisma.$transaction(
            async (tx) => {
                const updated = await tx.trip.update({
                    where: { id: tripId },
                    data: { status: TripStatus.started, startedAt: new Date() },
                });

                await this.audit.logTx(tx, {
                    action: AuditAction.TripStart,
                    entityType: 'trip',
                    entityId: tripId,
                    severity: 'info',
                    metadata: {
                        fromStatus: TripStatus.published,
                        toStatus: TripStatus.started,
                    },
                });

                await this.outbox.enqueueTx(tx, {
                    topic: OutboxTopic.TripStarted,
                    aggregateType: 'trip',
                    aggregateId: tripId,
                    idempotencyKey: `trip:${tripId}:started`,
                    payload: {
                        tripId,
                        driverId,
                        startedAt: updated.startedAt,
                    },
                });

                return updated;
            },
            { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
    }

    async completeTrip(driverId: string, tripId: string) {
        await this.drivers.assertVerifiedDriver(driverId);

        const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
        if (!trip) throw new NotFoundException('Trip not found');
        if (trip.driverId !== driverId) throw new ForbiddenException('Not your trip');

        if (trip.status !== TripStatus.started) {
            throw new BadRequestException('Only started trip can be completed');
        }

        await this.prisma.$transaction(
            async (tx) => {
                const updatedTrip = await tx.trip.update({
                    where: { id: tripId },
                    data: { status: TripStatus.completed, completedAt: new Date() },
                });

                await tx.booking.updateMany({
                    where: { tripId, status: { in: [BookingStatus.confirmed, BookingStatus.paid] } },
                    data: { status: BookingStatus.completed },
                });

                await this.audit.logTx(tx, {
                    action: AuditAction.TripComplete,
                    entityType: 'trip',
                    entityId: tripId,
                    severity: 'info',
                    metadata: {
                        fromStatus: TripStatus.started,
                        toStatus: TripStatus.completed,
                    },
                });

                await this.outbox.enqueueTx(tx, {
                    topic: OutboxTopic.TripCompleted,
                    aggregateType: 'trip',
                    aggregateId: tripId,
                    idempotencyKey: `trip:${tripId}:completed`,
                    payload: {
                        tripId,
                        driverId,
                        completedAt: updatedTrip.completedAt,
                    },
                });
            },
            { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );

        return { ok: true };
    }

    async cancelTrip(driverId: string, tripId: string, reason?: string) {
        await this.drivers.assertVerifiedDriver(driverId);

        return this.prisma.$transaction(
            async (tx) => {
                const trip = await tx.trip.findUnique({
                    where: { id: tripId },
                    include: { bookings: true },
                });
                if (!trip) throw new NotFoundException('Trip not found');
                if (trip.driverId !== driverId) throw new ForbiddenException('Not your trip');

                if (trip.status === TripStatus.completed) {
                    throw new BadRequestException('Completed trip cannot be canceled');
                }
                if (trip.status === TripStatus.canceled) return trip;

                const updatedTrip = await tx.trip.update({
                    where: { id: tripId },
                    data: {
                        status: TripStatus.canceled,
                        canceledAt: new Date(),
                        cancelReason: reason ?? null,
                    },
                });


                const now = new Date();

                // отменить pending requests
                await tx.tripRequest.updateMany({
                    where: { tripId, status: RequestStatus.pending },
                    data: {
                        status: RequestStatus.canceled, // или rejected — как у тебя принято
                        respondedAt: now,
                        rejectionReason: reason ?? 'Trip canceled',
                    },
                });

                // отменить active offers по этим requests
                await tx.offer.updateMany({
                    where: { request: { tripId }, status: OfferStatus.active },
                    data: {
                        status: OfferStatus.canceled,
                        respondedAt: now,
                        responseReason: 'Trip canceled',
                    },
                });

                const confirmedBookings = trip.bookings.filter(
                    (b) => [BookingStatus.confirmed, BookingStatus.paid].includes(b.status),
                );

                for (const b of confirmedBookings) {
                    await tx.booking.update({
                        where: { id: b.id },
                        data: { status: BookingStatus.canceled },
                    });

                    await tx.trip.update({
                        where: { id: tripId },
                        data: { seatsAvailable: { increment: b.seats } },
                    });

                    await tx.tripRequest.update({
                        where: { id: b.requestId },
                        data: {
                            status: RequestStatus.canceled,
                            respondedAt: new Date(),
                            rejectionReason: reason ?? null,
                        },
                    });
                }

                await this.audit.logTx(tx, {
                    action: AuditAction.TripCancel,
                    entityType: 'trip',
                    entityId: tripId,
                    severity: 'warning',
                    metadata: {
                        fromStatus: trip.status,
                        toStatus: TripStatus.canceled,
                        reason: reason ?? null,
                        canceledConfirmedBookings: confirmedBookings.length,
                    },
                });

                await this.outbox.enqueueTx(tx, {
                    topic: OutboxTopic.TripCanceled,
                    aggregateType: 'trip',
                    aggregateId: tripId,
                    idempotencyKey: `trip:${tripId}:canceled`,
                    payload: {
                        tripId,
                        driverId,
                        canceledAt: updatedTrip.canceledAt,
                        reason: reason ?? null,
                        canceledConfirmedBookings: confirmedBookings.length,
                    },
                });

                return updatedTrip;
            },
            { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
    }

    // ---------------------------------------------------------------------------
    // SEARCH
    // ---------------------------------------------------------------------------

    async searchTrips(dto: SearchTripsDto) {
        const page = dto.page ?? 1;
        const pageSize = dto.pageSize ?? 20;

        const where: Prisma.TripWhereInput = {
            ...(dto.fromCityId ? { fromCityId: dto.fromCityId } : {}),
            ...(dto.toCityId ? { toCityId: dto.toCityId } : {}),
            ...(dto.status ? { status: dto.status } : { status: TripStatus.published }),
            ...(dto.seats ? { seatsAvailable: { gte: dto.seats } } : {}),
            ...(dto.dateFrom || dto.dateTo
                ? {
                    departureAt: {
                        ...(dto.dateFrom ? { gte: new Date(dto.dateFrom) } : {}),
                        ...(dto.dateTo ? { lte: new Date(dto.dateTo) } : {}),
                    },
                }
                : {}),
        };

        const [items, total] = await this.prisma.$transaction([
            this.prisma.trip.findMany({
                where,
                orderBy: { departureAt: 'asc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
                include: {
                    fromCity: true,
                    toCity: true,
                    driver: { select: { id: true, phone: true } },
                    vehicle: true,
                },
            }),
            this.prisma.trip.count({ where }),
        ]);

        return { items, total, page, pageSize };
    }

    // ---------------------------------------------------------------------------
    // REQUESTS
    // ---------------------------------------------------------------------------

    async createRequest(passengerId: string, tripId: string, dto: CreateTripRequestDto) {
        const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });

        if (!trip) throw new NotFoundException('Trip not found');
        if (trip.status !== TripStatus.published) throw new BadRequestException('Trip not published');

        if (trip.driverId === passengerId) {
            throw new BadRequestException('Driver cannot request own trip');
        }

        if (dto.seats <= 0) throw new BadRequestException('seats must be > 0');
        if (dto.seats > trip.seatsAvailable) throw new BadRequestException('Not enough seats');

        const price = dto.price && dto.price > 0 ? dto.price : trip.price;
        if (price <= 0) throw new BadRequestException('price must be > 0');

        return this.prisma.$transaction(
            async (tx) => {
                try {
                    const created = await tx.tripRequest.create({
                        data: {
                            tripId,
                            passengerId,
                            seats: dto.seats,
                            price,
                            currency: trip.currency,
                            message: dto.message ?? null,
                            status: RequestStatus.pending,
                        },
                    });

                    await this.audit.logTx(tx, {
                        action: AuditAction.RequestCreate,
                        entityType: 'tripRequest',
                        entityId: created.id,
                        severity: 'info',
                        metadata: {
                            tripId,
                            passengerId,
                            seats: created.seats,
                            price: created.price,
                            currency: created.currency,
                        },
                    });

                    await this.outbox.enqueueTx(tx, {
                        topic: OutboxTopic.RequestCreated,
                        aggregateType: 'tripRequest',
                        aggregateId: created.id,
                        idempotencyKey: `tripRequest:${created.id}:created`,
                        payload: {
                            requestId: created.id,
                            tripId,
                            passengerId,
                            seats: created.seats,
                            price: created.price,
                            currency: created.currency,
                        },
                    });

                    return created;
                } catch (e: any) {
                    if (e?.code === 'P2002') {
                        throw new BadRequestException('Request already exists for this trip');
                    }
                    throw e;
                }
            },
            { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
    }

    async listTripRequests(driverId: string, tripId: string) {
        const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
        if (!trip) throw new NotFoundException('Trip not found');
        if (trip.driverId !== driverId) throw new ForbiddenException('Not your trip');

        return this.prisma.tripRequest.findMany({
            where: { tripId },
            orderBy: { createdAt: 'desc' },
            include: {
                passenger: { select: { id: true, phone: true, profile: true } },
                offers: { orderBy: { createdAt: 'desc' } },
                booking: true,
            },
        });
    }

    async acceptRequest(driverId: string, requestId: string) {
        await this.drivers.assertVerifiedDriver(driverId);

        return this.prisma.$transaction(
            async (tx) => {
                const req = await tx.tripRequest.findUnique({
                    where: { id: requestId },
                    include: { trip: true },
                });
                if (!req) throw new NotFoundException('Trip request not found');
                if (req.trip.driverId !== driverId) throw new ForbiddenException('Not your trip');

                if (req.status !== RequestStatus.pending) {
                    throw new BadRequestException('Request already processed');
                }
                if (req.trip.status !== TripStatus.published) {
                    throw new BadRequestException('Trip not published');
                }

                // Переговоры: пока есть активный offer — нельзя принимать request напрямую
                const activeOffer = await tx.offer.findFirst({
                    where: {
                        requestId: req.id,
                        status: OfferStatus.active,
                    },
                    select: { id: true, proposerId: true, proposerRole: true, price: true, currency: true },
                });

                if (activeOffer) {
                    throw new BadRequestException(
                        'Negotiation in progress: resolve active offer before accepting the request',
                    );
                }

                const acceptedOffer = await tx.offer.findFirst({
                    where: {
                        requestId: req.id,
                        status: OfferStatus.accepted,
                    },
                    orderBy: { respondedAt: 'desc' },
                    select: { id: true, price: true, currency: true },
                });

                if (acceptedOffer) {
                    // если у тебя цена фиксируется в request при acceptOffer — это просто sanity check
                    if (req.price !== acceptedOffer.price || req.currency !== acceptedOffer.currency) {
                        throw new BadRequestException('Accepted offer exists, but request price is inconsistent');
                    }
                }


                // 1) атомарно списываем места (защита от гонок)
                const seatDec = await tx.trip.updateMany({
                    where: {
                        id: req.tripId,
                        driverId,
                        status: TripStatus.published,
                        seatsAvailable: { gte: req.seats },
                    },
                    data: { seatsAvailable: { decrement: req.seats } },
                });
                if (seatDec.count !== 1) {
                    throw new BadRequestException('Not enough seats available');
                }

                const now = new Date();

                // 2) request pending -> accepted (защита от двойного accept)
                const reqUpd = await tx.tripRequest.updateMany({
                    where: { id: req.id, status: RequestStatus.pending },
                    data: {
                        status: RequestStatus.accepted,
                        respondedAt: now,
                        // если у тебя есть поле для notes/reason — заполни
                    },
                });
                if (reqUpd.count !== 1) {
                    throw new BadRequestException('Request already processed');
                }

                // 3) создаём booking (requestId должен быть unique в booking, это правильно)
                const booking = await tx.booking.create({
                    data: {
                        requestId: req.id,
                        tripId: req.tripId,
                        passengerId: req.passengerId,
                        seats: req.seats,
                        price: req.price,
                        currency: req.currency,
                        status: BookingStatus.confirmed,
                    },
                });

                // 4) закрываем активные offers по request (если offer-переговоры включены)
                await tx.offer.updateMany({
                    where: { requestId: req.id, status: OfferStatus.active },
                    data: {
                        status: OfferStatus.canceled,
                        respondedAt: now,
                        responseReason: 'Request accepted',
                        responseNote: null,
                    },
                });

                await this.audit.logTx(tx, {
                    action: AuditAction.RequestAccept,
                    entityType: 'tripRequest',
                    entityId: req.id,
                    severity: 'critical',
                    metadata: {
                        tripId: req.tripId,
                        driverId,
                        passengerId: req.passengerId,
                        seats: req.seats,
                        price: req.price,
                        currency: req.currency,
                        bookingId: booking.id,
                    },
                });

                await this.outbox.enqueueTx(tx, {
                    topic: OutboxTopic.RequestAccepted,
                    aggregateType: 'tripRequest',
                    aggregateId: req.id,
                    idempotencyKey: `tripRequest:${req.id}:accepted`,
                    payload: {
                        requestId: req.id,
                        tripId: req.tripId,
                        driverId,
                        passengerId: req.passengerId,
                        seats: req.seats,
                        price: req.price,
                        currency: req.currency,
                        bookingId: booking.id,
                    },
                });

                const updatedReq = await tx.tripRequest.findUnique({ where: { id: req.id } });
                return { request: updatedReq, booking };
            },
            { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
    }


    async rejectRequest(driverId: string, requestId: string, dto: RejectRequestDto) {
        await this.drivers.assertVerifiedDriver(driverId);

        return this.prisma.$transaction(
            async (tx) => {
                const req = await tx.tripRequest.findUnique({
                    where: { id: requestId },
                    include: { trip: true },
                });
                if (!req) throw new NotFoundException('Trip request not found');
                if (req.trip.driverId !== driverId) throw new ForbiddenException('Not your trip');

                if (req.status !== RequestStatus.pending) {
                    throw new BadRequestException('Request already processed');
                }

                const upd = await tx.tripRequest.updateMany({
                    where: { id: requestId, status: RequestStatus.pending },
                    data: {
                        status: RequestStatus.rejected,
                        respondedAt: new Date(),
                        rejectionReason: dto.reason ?? null,
                    },
                });
                if (upd.count !== 1) {
                    throw new BadRequestException('Request already processed');
                }

                // close offers
                // TODO: replace with OfferStatus enum if you have it.
                await tx.offer.updateMany({
                    where: { requestId: req.id, status: OfferStatus.active },
                    data: { status: OfferStatus.canceled, respondedAt: new Date() },
                });

                await this.audit.logTx(tx, {
                    action: AuditAction.RequestReject,
                    entityType: 'tripRequest',
                    entityId: req.id,
                    severity: 'info',
                    metadata: {
                        tripId: req.tripId,
                        passengerId: req.passengerId,
                        reason: dto.reason ?? null,
                    },
                });

                await this.outbox.enqueueTx(tx, {
                    topic: OutboxTopic.RequestRejected,
                    aggregateType: 'tripRequest',
                    aggregateId: req.id,
                    idempotencyKey: `tripRequest:${req.id}:rejected`,
                    payload: {
                        requestId: req.id,
                        tripId: req.tripId,
                        driverId,
                        passengerId: req.passengerId,
                        reason: dto.reason ?? null,
                    },
                });

                const updatedReq = await tx.tripRequest.findUnique({ where: { id: req.id } });
                return { request: updatedReq };
            },
            { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
    }
}
