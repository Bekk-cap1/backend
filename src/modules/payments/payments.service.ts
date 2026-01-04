import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PaymentProvider, PaymentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { PaymentsRepository } from './payments.repository';
import { PaymentProviderRegistry } from './providers/payment-provider.registry';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { ListPaymentsDto } from './dto/list-payments.dto';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: PaymentsRepository,
    private readonly registry: PaymentProviderRegistry,
  ) {}

  async createIntent(userId: string, bookingId: string, dto: CreatePaymentIntentDto) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { passenger: true, trip: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.passengerId !== userId) throw new ForbiddenException('Not your booking');

    // правило: платить можно только за confirmed
    if (booking.status !== 'confirmed') throw new BadRequestException('Booking not payable');

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
        customer: { userId: booking.passengerId, phone: booking.passenger.phone },
        metadata: { bookingId },
      });
      return { payment: existing, intent };
    }

    // создаем payment pending
    const payment = await this.repo.create({
      booking: { connect: { id: bookingId } },
      provider: dto.provider,
      status: PaymentStatus.pending,
      amount: booking.price,
      currency: booking.currency,
      payload: dto.idempotencyKey ? { idempotencyKey: dto.idempotencyKey } : undefined,
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

    return { payment, intent };
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

  /**
   * Унифицированный обработчик вебхуков.
   * Здесь будет:
   * - verify signature (в adapter)
   * - поиск payment по externalId или по metadata
   * - обновление Payment.status
   * - доменные эффекты (например, подтверждение оплаты)
   */
  async handleWebhook(provider: PaymentProvider, headers: Record<string, any>, rawBody: Buffer) {
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

    // обновление статуса (приводим в enum Prisma)
    const next =
      parsed.status === 'succeeded' ? PaymentStatus.succeeded :
      parsed.status === 'failed' ? PaymentStatus.failed :
      parsed.status === 'canceled' ? PaymentStatus.canceled :
      parsed.status === 'refunded' ? PaymentStatus.refunded :
      PaymentStatus.pending;

    await this.repo.updateStatus(payment.id, next, parsed.raw ?? undefined, parsed.externalId);

    // доменные эффекты добавим позже:
    // - если succeeded: фиксируем “оплата принята”
    // - если refunded: возврат и т.п.

    return { ok: true };
  }
}
