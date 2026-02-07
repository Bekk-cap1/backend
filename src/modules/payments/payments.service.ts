import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BookingStatus,
  PaymentProvider,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { createHash } from 'crypto';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { PaymentsRepository } from './payments.repository';
import { PaymentProviderRegistry } from './providers/payment-provider.registry';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { ListPaymentsDto } from './dto/list-payments.dto';
import { OutboxService } from '../../outbox/outbox.service';
import { OutboxTopic } from '../../outbox/outbox.topics';
import type { WebhookResult } from './providers/payment-provider.interface';
import { PaymentQuoteDto } from './dto/payment-quote.dto';
import { RoutingService } from '../routing/routing.service';
import { MetricsService } from '../metrics/metrics.service';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: PaymentsRepository,
    private readonly registry: PaymentProviderRegistry,
    private readonly outbox: OutboxService,
    private readonly routing: RoutingService,
    private readonly metrics: MetricsService,
  ) {}

  async quote(userId: string, dto: PaymentQuoteDto) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: dto.tripId },
      select: {
        id: true,
        status: true,
        driverId: true,
        fromCityId: true,
        toCityId: true,
      },
    });
    if (!trip) throw new NotFoundException('Trip not found');

    const coords = await this.prisma.$queryRaw<
      Array<{ fromLat: number; fromLon: number; toLat: number; toLon: number }>
    >`
      SELECT
        ST_Y(COALESCE(t."fromPoint", cf."location")::geometry) AS "fromLat",
        ST_X(COALESCE(t."fromPoint", cf."location")::geometry) AS "fromLon",
        ST_Y(COALESCE(t."toPoint", ct."location")::geometry) AS "toLat",
        ST_X(COALESCE(t."toPoint", ct."location")::geometry) AS "toLon"
      FROM "Trip" t
      LEFT JOIN "City" cf ON cf."id" = t."fromCityId"
      LEFT JOIN "City" ct ON ct."id" = t."toCityId"
      WHERE t."id" = ${dto.tripId}
      LIMIT 1
    `;
    const c = coords[0];
    if (!c)
      throw new BadRequestException('Trip coordinates are not configured');

    const route = await this.routing.route(
      { lat: c.fromLat, lon: c.fromLon },
      { lat: c.toLat, lon: c.toLon },
    );
    const distanceKm = route.distanceMeters / 1000;
    const amount = Math.round((5000 + distanceKm * 1200) * dto.seats);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    const quote = await this.prisma.fareQuote.create({
      data: {
        userId,
        tripId: dto.tripId,
        seats: dto.seats,
        amount,
        currency: 'UZS',
        distanceMeters: route.distanceMeters,
        durationSeconds: route.durationSeconds,
        provider: route.provider,
        expiresAt,
      },
      select: {
        id: true,
        expiresAt: true,
      },
    });
    this.metrics.incFeature('fare_quote_created');

    return {
      quoteId: quote.id,
      tripId: dto.tripId,
      seats: dto.seats,
      amount,
      currency: 'UZS',
      distanceMeters: route.distanceMeters,
      durationSeconds: route.durationSeconds,
      provider: route.provider,
      calculatedForUserId: userId,
      expiresAt: quote.expiresAt,
    };
  }

  async createIntent(
    userId: string,
    bookingId: string,
    dto: CreatePaymentIntentDto,
  ) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { passenger: true, trip: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.passengerId !== userId)
      throw new ForbiddenException('Not your booking');

    // правило: платить можно только за confirmed
    if (booking.status !== BookingStatus.confirmed)
      throw new BadRequestException('Booking not payable');

    // идемпотентность (временный вариант без поля в БД)
    const existing = await this.repo.findIdempotent({
      bookingId,
      provider: dto.provider,
      amount: booking.price,
      currency: booking.currency,
      key: dto.idempotencyKey,
    });
    if (existing) {
      const adapter = this.registry.get(existing.provider);
      const intent = await adapter.createIntent({
        paymentId: existing.id,
        amount: existing.amount,
        currency: existing.currency,
        description: dto.description ?? null,
        customer: {
          userId: booking.passengerId,
          phone: booking.passenger.phone,
        },
        metadata: { bookingId },
      });
      const updatedExisting =
        existing.status === PaymentStatus.created
          ? await this.repo.updateStatus(existing.id, PaymentStatus.pending)
          : existing;
      return { payment: updatedExisting, intent };
    }

    // создаем payment created
    const payment = await this.repo.create({
      booking: { connect: { id: bookingId } },
      provider: dto.provider,
      status: PaymentStatus.created,
      amount: booking.price,
      currency: booking.currency,
      payload: dto.idempotencyKey
        ? { idempotencyKey: dto.idempotencyKey }
        : undefined,
    });

    const adapter = this.registry.get(dto.provider);
    const intent = await adapter.createIntent({
      paymentId: payment.id,
      amount: payment.amount,
      currency: payment.currency,
      description: dto.description ?? null,
      customer: { userId: booking.passengerId, phone: booking.passenger.phone },
      metadata: { bookingId },
    });

    const updatedPayment = await this.repo.updateStatus(
      payment.id,
      PaymentStatus.pending,
    );

    return { payment: updatedPayment, intent };
  }

  async listMy(userId: string, q: ListPaymentsDto) {
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;

    const where: Prisma.PaymentWhereInput = {
      booking: { passengerId: userId },
      ...(q.bookingId ? { bookingId: q.bookingId } : {}),
      ...(q.provider ? { provider: q.provider } : {}),
      ...(q.status ? { status: q.status } : {}),
    };

    const [items, total] = await this.repo.list(where, page, pageSize);
    return { items, total, page, pageSize };
  }

  async listMyQuotes(userId: string) {
    return this.prisma.fareQuote.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async markPaid(paymentId: string, note?: string) {
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const payment = await tx.payment.findUnique({
        where: { id: paymentId },
      });
      if (!payment) throw new NotFoundException('Payment not found');
      if (
        payment.status !== PaymentStatus.created &&
        payment.status !== PaymentStatus.pending
      ) {
        throw new BadRequestException('Payment is not in payable state');
      }

      const updated = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.paid,
          paidAt: payment.paidAt ?? new Date(),
        },
      });

      await tx.booking.updateMany({
        where: { id: payment.bookingId, status: BookingStatus.confirmed },
        data: { status: BookingStatus.paid },
      });

      await tx.paymentLedgerEntry.create({
        data: {
          paymentId: payment.id,
          bookingId: payment.bookingId,
          entryType: 'payment_marked_paid',
          amount: payment.amount,
          currency: payment.currency,
          note: note ?? 'Marked paid from admin endpoint',
        },
      });

      await this.outbox.enqueueTx(tx, {
        topic: OutboxTopic.PaymentMarkedPaid,
        aggregateType: 'payment',
        aggregateId: payment.id,
        idempotencyKey: `payment:${payment.id}:marked-paid`,
        payload: {
          paymentId: payment.id,
          bookingId: payment.bookingId,
          amount: payment.amount,
          currency: payment.currency,
          paidAt: updated.paidAt,
          note: note ?? null,
        },
      });
      this.metrics.incFeature('payment_marked_paid');

      return { ok: true, payment: updated };
    });
  }

  /**
   * Унифицированный обработчик вебхуков.
   * Здесь будет:
   * - verify signature (в adapter)
   * - поиск payment по externalId или по metadata
   * - обновление Payment.status
   * - доменные эффекты (например, подтверждение оплаты)
   */
  async handleWebhook(
    provider: PaymentProvider,
    headers: Record<string, string | string[] | undefined>,
    rawBody: Buffer,
  ) {
    const adapter = this.registry.get(provider);
    const parsed = await adapter.verifyAndParseWebhook({ headers, rawBody });

    // пока шаблон: если externalId не пришёл — просто логический stub
    if (!parsed.externalId) {
      return { ok: true, stub: true, parsed };
    }

    const payment = await this.repo.findByExternalId(parsed.externalId);
    if (!payment) {
      // в будущем: попытка найти по payload/metadata или создать “orphan” запись
      return { ok: true, orphan: true };
    }

    const dedupeKey = this.buildDedupeKey(provider, parsed);

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const eventPayload = (parsed.raw ?? parsed) as Prisma.InputJsonValue;
      const event = await tx.paymentEvent
        .create({
          data: {
            paymentId: payment.id,
            provider,
            externalEventId: parsed.externalEventId ?? null,
            dedupeKey,
            type: parsed.status ?? 'unknown',
            payload: eventPayload,
          },
        })
        .catch((err: unknown) => {
          if (
            err instanceof Prisma.PrismaClientKnownRequestError &&
            err.code === 'P2002'
          ) {
            return null;
          }
          throw err;
        });

      if (!event) {
        return { ok: true, duplicate: true };
      }

      const next = this.mapWebhookStatus(parsed);
      if (!next) return { ok: true };

      if (next === payment.status) {
        return { ok: true };
      }

      if (!this.isValidTransition(payment.status, next)) {
        return { ok: true, ignored: true };
      }

      const now = new Date();
      const updateData: Prisma.PaymentUpdateInput = {
        status: next,
        payload: parsed.raw ?? undefined,
        externalId: parsed.externalId ?? undefined,
      };

      if (next === PaymentStatus.paid) {
        updateData.paidAt = payment.paidAt ?? now;
      }

      if (next === PaymentStatus.refunded) {
        updateData.refundedAt = payment.refundedAt ?? now;
      }

      const updated = await tx.payment.update({
        where: { id: payment.id },
        data: updateData,
      });

      if (next === PaymentStatus.paid) {
        await tx.booking.updateMany({
          where: { id: payment.bookingId, status: BookingStatus.confirmed },
          data: { status: BookingStatus.paid },
        });

        await tx.paymentLedgerEntry.create({
          data: {
            paymentId: payment.id,
            bookingId: payment.bookingId,
            entryType: 'payment_paid',
            amount: payment.amount,
            currency: payment.currency,
            note: 'Webhook marked payment as paid',
          },
        });

        await this.outbox.enqueueTx(tx, {
          topic: OutboxTopic.PaymentPaid,
          aggregateType: 'payment',
          aggregateId: payment.id,
          idempotencyKey: `payment:${payment.id}:paid`,
          payload: {
            paymentId: payment.id,
            bookingId: payment.bookingId,
            provider: payment.provider,
            amount: payment.amount,
            currency: payment.currency,
            paidAt: updated.paidAt,
          },
        });
      }

      return { ok: true };
    });
  }

  private mapWebhookStatus(parsed: WebhookResult): PaymentStatus | null {
    if (!parsed.status) return null;

    if (parsed.status === 'succeeded') return PaymentStatus.paid;
    if (parsed.status === 'canceled') return PaymentStatus.failed;

    if (parsed.status === 'created') return PaymentStatus.created;
    if (parsed.status === 'pending') return PaymentStatus.pending;
    if (parsed.status === 'paid') return PaymentStatus.paid;
    if (parsed.status === 'failed') return PaymentStatus.failed;
    if (parsed.status === 'refunded') return PaymentStatus.refunded;

    return null;
  }

  private isValidTransition(current: PaymentStatus, next: PaymentStatus) {
    if (current === next) return true;

    const allowed: Record<PaymentStatus, PaymentStatus[]> = {
      [PaymentStatus.created]: [PaymentStatus.pending],
      [PaymentStatus.pending]: [PaymentStatus.paid, PaymentStatus.failed],
      [PaymentStatus.paid]: [PaymentStatus.refunded],
      [PaymentStatus.failed]: [],
      [PaymentStatus.refunded]: [],
    };

    return allowed[current]?.includes(next) ?? false;
  }

  private buildDedupeKey(provider: PaymentProvider, parsed: WebhookResult) {
    if (parsed.externalEventId) {
      return `${provider}:${parsed.externalEventId}`;
    }

    const base = JSON.stringify({
      externalId: parsed.externalId ?? null,
      status: parsed.status ?? null,
      amount: parsed.amount ?? null,
      currency: parsed.currency ?? null,
    });
    const digest = createHash('sha256').update(base).digest('hex');
    return `${provider}:${parsed.externalId ?? 'unknown'}:${digest}`;
  }
}
