import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { BookingStatus, OfferStatus, Prisma, RequestStatus, Role, TripStatus } from '@prisma/client';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { AuditAction } from '../../audit/audit.actions';
import { OutboxService } from '../../outbox/outbox.service';
import { OutboxTopic } from '../../outbox/outbox.topics';

import { CreateOfferDto } from './dto/create-offer.dto';
import { AcceptOfferDto } from './dto/accept-offer.dto';
import { RejectOfferDto } from './dto/reject-offer.dto';

@Injectable()
export class OffersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
  ) { }

  private assertRoleAllowed(role: any): asserts role is Role {
    if (role !== Role.driver && role !== Role.passenger) {
      throw new ForbiddenException('Role not allowed');
    }
  }

  /**
   * Кто имеет доступ:
   * - passenger, который создал request
   * - driver, владелец trip по request
   */
  private async assertParticipant(tx: Prisma.TransactionClient, userId: string, role: Role, requestId: string) {
    const req = await tx.tripRequest.findUnique({
      where: { id: requestId },
      include: { trip: true },
    });
    if (!req) throw new NotFoundException('Trip request not found');

    const isPassengerOwner = req.passengerId === userId;
    const isTripDriver = req.trip.driverId === userId;

    if (!isPassengerOwner && !isTripDriver) {
      throw new ForbiddenException('Not allowed for this request');
    }

    // Доп. защита по роли (если вдруг у пользователя роль не совпадает)
    if (role === Role.passenger && !isPassengerOwner) {
      throw new ForbiddenException('Passenger cannot access чужой request');
    }
    if (role === Role.driver && !isTripDriver) {
      throw new ForbiddenException('Driver cannot access чужой request');
    }

    return req;
  }

  async listForRequest(userId: string, role: any, requestId: string) {
  this.assertRoleAllowed(role);

  const MAX_PER_SIDE = 3;

  return this.prisma.$transaction(async (tx) => {
    const req = await this.assertParticipant(tx, userId, role, requestId);

    // все offers
    const items = await tx.offer.findMany({
      where: { requestId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        requestId: true,
        proposerId: true,
        proposerRole: true,
        price: true,
        currency: true,
        message: true,
        status: true,
        respondedAt: true,
        responseNote: true,
        responseReason: true,
        createdAt: true,
      },
    });

    // принятый оффер (переговоры завершены)
    const accepted = items.find((x) => x.status === OfferStatus.accepted) ?? null;

    // активный оффер (текущий “ход” ожидает ответа)
    const active = items.find((x) => x.status === OfferStatus.active) ?? null;

    // последний по времени оффер (любой статус)
    const last = items[0] ?? null;

    // попытки (3+3)
    const driverAttemptsUsed = await tx.offer.count({
      where: { requestId, proposerRole: Role.driver },
    });

    const passengerAttemptsUsed = await tx.offer.count({
      where: { requestId, proposerRole: Role.passenger },
    });

    const myAttemptsUsed = role === Role.driver ? driverAttemptsUsed : passengerAttemptsUsed;
    const myAttemptsLeft = Math.max(0, MAX_PER_SIDE - myAttemptsUsed);

    // чей следующий ход (строго по очереди)
    // если еще не было офферов -> ход может быть любой стороны (null)
    const nextTurnRole: Role | null = last
      ? (last.proposerRole === Role.driver ? Role.passenger : Role.driver)
      : null;

    // можно ли текущему пользователю предложить цену сейчас
    // правила такие же как в createOffer:
    // - если есть accepted -> нельзя
    // - если request не pending / trip не published -> нельзя
    // - если active и он твой -> нельзя
    // - если active от другой стороны -> можно (это counter-offer)
    // - если нет active -> можно только если не твой ход подряд (то есть last.proposerRole !== role)
    const negotiationOk =
      req.status === RequestStatus.pending &&
      req.trip.status === TripStatus.published &&
      !accepted;

    let canPropose = false;

    if (negotiationOk && myAttemptsLeft > 0) {
      if (active) {
        canPropose = active.proposerId !== userId; // counter-offer
      } else {
        canPropose = !last || last.proposerRole !== role; // не два раза подряд
      }
    }

    // можно ли принять/отклонить активный оффер
    const canAccept = Boolean(
      negotiationOk &&
      active &&
      active.proposerId !== userId &&
      active.proposerRole !== role, // противоположная сторона
    );

    const canReject = canAccept; // отклонение доступно только контрагенту на active
    const canCancel = Boolean(negotiationOk && active && active.proposerId === userId);

    const meta = {
      maxPerSide: MAX_PER_SIDE,
      driverAttemptsUsed,
      passengerAttemptsUsed,
      myAttemptsUsed,
      myAttemptsLeft,
      nextTurnRole, // null = любой может начать
      acceptedOfferId: accepted?.id ?? null,
      activeOfferId: active?.id ?? null,
      activeOfferProposerRole: active?.proposerRole ?? null,
      canPropose,
      canAccept,
      canReject,
      canCancel,
    };

    return { items, meta };
  });
}


  /**
   * Создать offer:
   * - request должен быть pending
   * - trip должен быть published
   * - proposer может быть driver или passenger, но только участник
   * - один active offer на request на proposer (unique)
   * - при создании: отменяем предыдущий active offer того же proposer (если был)
   */
  async createOffer(userId: string, role: any, requestId: string, dto: CreateOfferDto) {
    this.assertRoleAllowed(role);

    if (!dto.price || dto.price <= 0) {
      throw new BadRequestException('price must be > 0');
    }

    const MAX_PER_SIDE = 3;

    return this.prisma.$transaction(
      async (tx) => {
        const req = await this.assertParticipant(tx, userId, role, requestId);

        if (req.status !== RequestStatus.pending) {
          throw new BadRequestException('Only pending request can have offers');
        }
        if (req.trip.status !== TripStatus.published) {
          throw new BadRequestException('Trip is not published');
        }

        // 0) если уже приняли — переговоры закрыты
        const accepted = await tx.offer.findFirst({
          where: { requestId, status: OfferStatus.accepted },
          select: { id: true },
        });
        if (accepted) {
          throw new BadRequestException('Negotiation already finished (offer accepted)');
        }

        // 1) запрет если уже есть активный offer (сначала принять/отклонить/контроффер)
        const active = await tx.offer.findFirst({
          where: { requestId, status: OfferStatus.active },
          orderBy: { createdAt: 'desc' },
          select: { id: true, proposerId: true, proposerRole: true },
        });
        if (active) {
          // если активный от тебя — жди ответа или cancel
          if (active.proposerId === userId) {
            throw new BadRequestException('Wait for counterparty response or cancel your active offer');
          }

          // активный от другой стороны — в turn-based модели контр-оффер является ответом,
          // поэтому мы автоматически "закрываем" предыдущий active как rejected(cause=counter_offer)
          await tx.offer.updateMany({
            where: { id: active.id, status: OfferStatus.active },
            data: {
              status: OfferStatus.rejected,
              respondedAt: new Date(),
              responseReason: 'counter_offer',
              responseNote: null,
            },
          });
        }

        // 2) проверка очередности (чередование):
        // последний offer (любой статус) не должен быть от этой же роли
        const last = await tx.offer.findFirst({
          where: { requestId },
          orderBy: { createdAt: 'desc' },
          select: { proposerRole: true },
        });
        if (last && last.proposerRole === role) {
          throw new BadRequestException('Not your turn. Counterparty must respond first');
        }

        // 3) лимит 3 предложения на сторону (role-based)
        const myAttempts = await tx.offer.count({
          where: { requestId, proposerRole: role },
        });
        if (myAttempts >= MAX_PER_SIDE) {
          throw new BadRequestException(`This side can propose only ${MAX_PER_SIDE} times`);
        }

        // 4) создаём новый offer
        const created = await tx.offer.create({
          data: {
            requestId,
            proposerId: userId,
            proposerRole: role,
            seats: dto.seats,
            price: dto.price,
            currency: req.currency,
            message: dto.message ?? null,
            status: OfferStatus.active,
          },
        });

        await this.audit.logTx(tx, {
          action: AuditAction.OfferCreate,
          entityType: 'offer',
          entityId: created.id,
          severity: 'info',
          metadata: {
            requestId,
            tripId: req.tripId,
            proposerId: userId,
            proposerRole: role,
            price: created.price,
            currency: created.currency,
            attemptNo: myAttempts + 1, // 1..3 для этой стороны
          },
        });

        await this.outbox.enqueueTx(tx, {
          topic: OutboxTopic.OfferCreated,
          aggregateType: 'offer',
          aggregateId: created.id,
          idempotencyKey: `offer:${created.id}:created`,
          payload: {
            offerId: created.id,
            requestId,
            tripId: req.tripId,
            proposerId: userId,
            proposerRole: role,
            price: created.price,
            currency: created.currency,
            attemptNo: myAttempts + 1,
          },
        });

        return created;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }



  /**
   * Принять offer:
   * - принять может только “противоположная сторона”
   * - offer должен быть active
   * - request должен быть pending
   * - при accept: offer=accepted, остальные active offers -> canceled
   * - обновляем price на request (это и есть “пересчет денег”)
   */


  async acceptOffer(userId: string, role: any, offerId: string, dto: AcceptOfferDto) {
    this.assertRoleAllowed(role);

    return this.prisma.$transaction(
      async (tx) => {
        const offer = await tx.offer.findUnique({
          where: { id: offerId },
          include: { request: { include: { trip: true } } },
        });
        if (!offer) throw new NotFoundException('Offer not found');

        // доступ только участникам request
        const req = await this.assertParticipant(tx, userId, role, offer.requestId);

        // 1) базовые проверки
        if (offer.status !== OfferStatus.active) { // или pending
          throw new BadRequestException('Only active offer can be accepted');
        }
        if (req.status !== RequestStatus.pending) {
          throw new BadRequestException('Only pending request can accept offers');
        }
        if (req.trip.status !== TripStatus.published) {
          throw new BadRequestException('Trip is not published');
        }

        // 2) принять может только контрагент
        if (offer.proposerId === userId) throw new ForbiddenException('Cannot accept your own offer');
        if (offer.proposerRole === role) throw new ForbiddenException('Only counterparty can accept this offer');

        // 3) seats инварианты (предположим, что request.seats хранит нужное кол-во мест)
        // Если у тебя seats в request нет — добавь или вычисляй из request/booking модели.
        const seatsToReserve = req.seats;

        // 4) атомарно резервируем места в trip (защита от гонок)
        const tripUpd = await tx.trip.updateMany({
          where: {
            id: req.tripId,
            seatsAvailable: { gte: seatsToReserve },
            status: TripStatus.published,
          },
          data: { seatsAvailable: { decrement: seatsToReserve } },
        });
        if (tripUpd.count !== 1) {
          throw new BadRequestException('Not enough seats or trip not available (race condition)');
        }

        const now = new Date();

        // 5) атомарно принимаем offer (защита от повторной обработки)
        const acceptRes = await tx.offer.updateMany({
          where: { id: offerId, status: OfferStatus.active }, // или pending
          data: {
            status: OfferStatus.accepted,
            respondedAt: now,
            responseNote: dto.note ?? null,
            responseReason: null,
          },
        });
        if (acceptRes.count !== 1) throw new BadRequestException('Offer already processed');

        // 6) отменяем остальные активные офферы по request
        await tx.offer.updateMany({
          where: {
            requestId: offer.requestId,
            status: OfferStatus.active, // или pending
            id: { not: offerId },
          },
          data: {
            status: OfferStatus.canceled,
            respondedAt: now,
            responseReason: 'Another offer accepted',
          },
        });

        // 7) фиксируем request как accepted + price из offer
        const updatedRequest = await tx.tripRequest.updateMany({
          where: { id: req.id, status: RequestStatus.pending },
          data: {
            status: RequestStatus.accepted,
            respondedAt: now,
            price: offer.price,
            // currency оставляем как есть (req.currency)
          },
        });
        if (updatedRequest.count !== 1) {
          throw new BadRequestException('Request already processed');
        }

        const activeOffer = await tx.offer.findFirst({
          where: { requestId: req.id, status: OfferStatus.active },
          select: { id: true },
        });
        if (activeOffer) {
          throw new BadRequestException('Negotiation in progress. Accept the last offer or make a counter-offer first.');
        }



        // 8) создаём booking (1:1 с request)
        const booking = await tx.booking.create({
          data: {
            tripId: req.tripId,
            requestId: req.id,
            passengerId: req.passengerId,
            seats: seatsToReserve,
            price: offer.price,
            currency: req.currency,
            status: BookingStatus.confirmed,
          },
        });

        // 9) audit + outbox
        await this.audit.logTx(tx, {
          action: AuditAction.OfferAccept,
          entityType: 'offer',
          entityId: offerId,
          severity: 'critical',
          metadata: {
            requestId: req.id,
            tripId: req.tripId,
            bookingId: booking.id,
            acceptedById: userId,
            acceptedByRole: role,
            proposerId: offer.proposerId,
            proposerRole: offer.proposerRole,
            price: offer.price,
            currency: req.currency,
            note: dto.note ?? null,
          },
        });

        await this.outbox.enqueueTx(tx, {
          topic: OutboxTopic.OfferAccepted,
          aggregateType: 'offer',
          aggregateId: offerId,
          idempotencyKey: `offer:${offerId}:accepted`,
          payload: {
            offerId,
            requestId: req.id,
            tripId: req.tripId,
            bookingId: booking.id,
            acceptedById: userId,
            acceptedByRole: role,
            proposerId: offer.proposerId,
            proposerRole: offer.proposerRole,
            price: offer.price,
            currency: req.currency,
          },
        });

        return { ok: true, requestId: req.id, bookingId: booking.id };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async rejectOffer(userId: string, role: any, offerId: string, dto: RejectOfferDto) {
    this.assertRoleAllowed(role);

    return this.prisma.$transaction(
      async (tx) => {
        const offer = await tx.offer.findUnique({
          where: { id: offerId },
          include: { request: { include: { trip: true } } },
        });
        if (!offer) throw new NotFoundException('Offer not found');

        await this.assertParticipant(tx, userId, role, offer.requestId);

        if (offer.status !== OfferStatus.active) {
          throw new BadRequestException('Only active offer can be rejected');
        }
        if (offer.proposerId === userId) {
          throw new ForbiddenException('Cannot reject your own offer');
        }
        if (offer.proposerRole === role) {
          throw new ForbiddenException('Only counterparty can reject this offer');
        }

        const upd = await tx.offer.updateMany({
          where: { id: offerId, status: OfferStatus.active },
          data: {
            status: OfferStatus.rejected,
            respondedAt: new Date(),
            responseReason: dto.reason ?? null,
            responseNote: dto.note ?? null,
          },

        });

        if (upd.count !== 1) throw new BadRequestException('Offer already processed');

        await this.audit.logTx(tx, {
          action: AuditAction.OfferReject,
          entityType: 'offer',
          entityId: offerId,
          severity: 'info',
          metadata: {
            requestId: offer.requestId,
            tripId: offer.request.tripId,
            rejectedById: userId,
            rejectedByRole: role,
            proposerId: offer.proposerId,
            proposerRole: offer.proposerRole,
            reason: dto.reason ?? null,
          },
        });

        await this.outbox.enqueueTx(tx, {
          topic: OutboxTopic.OfferRejected,
          aggregateType: 'offer',
          aggregateId: offerId,
          idempotencyKey: `offer:${offerId}:rejected`,
          payload: {
            offerId,
            requestId: offer.requestId,
            tripId: offer.request.tripId,
            rejectedById: userId,
            rejectedByRole: role,
          },
        });

        return { ok: true };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async cancelOffer(userId: string, role: any, offerId: string) {
    this.assertRoleAllowed(role);

    return this.prisma.$transaction(
      async (tx) => {
        const offer = await tx.offer.findUnique({
          where: { id: offerId },
          include: { request: { include: { trip: true } } },
        });
        if (!offer) throw new NotFoundException('Offer not found');

        await this.assertParticipant(tx, userId, role, offer.requestId);

        // cancel может только автор
        if (offer.proposerId !== userId) {
          throw new ForbiddenException('Only proposer can cancel offer');
        }

        if (offer.status !== OfferStatus.active) {
          // идемпотентность: если уже не active — просто ok
          return { ok: true };
        }

        const upd = await tx.offer.updateMany({
          where: { id: offerId, status: OfferStatus.active },
          data: {
            status: OfferStatus.canceled,
            respondedAt: new Date(),
            responseNote: null,
            responseReason: null,
          },
        });

        if (upd.count !== 1) return { ok: true };

        await this.audit.logTx(tx, {
          action: AuditAction.OfferCancel,
          entityType: 'offer',
          entityId: offerId,
          severity: 'info',
          metadata: {
            requestId: offer.requestId,
            tripId: offer.request.tripId,
            proposerId: offer.proposerId,
            proposerRole: offer.proposerRole,
          },
        });

        await this.outbox.enqueueTx(tx, {
          topic: OutboxTopic.OfferCanceled,
          aggregateType: 'offer',
          aggregateId: offerId,
          idempotencyKey: `offer:${offerId}:canceled`,
          payload: {
            offerId,
            requestId: offer.requestId,
            tripId: offer.request.tripId,
            proposerId: offer.proposerId,
            proposerRole: offer.proposerRole,
          },
        });

        return { ok: true };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
}
