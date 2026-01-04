import { Injectable } from '@nestjs/common';
import { Prisma, PaymentProvider, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Injectable()
export class PaymentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.PaymentCreateInput) {
    return this.prisma.payment.create({ data });
  }

  findById(id: string) {
    return this.prisma.payment.findUnique({ where: { id } });
  }

  findByExternalId(externalId: string) {
    return this.prisma.payment.findFirst({ where: { externalId } });
  }

  updateStatus(id: string, status: PaymentStatus, payload?: any, externalId?: string | null) {
    return this.prisma.payment.update({
      where: { id },
      data: {
        status,
        payload: payload ?? undefined,
        externalId: externalId ?? undefined,
      },
    });
  }

  list(where: Prisma.PaymentWhereInput, page: number, pageSize: number) {
    return this.prisma.$transaction([
      this.prisma.payment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { booking: { include: { trip: true } } },
      }),
      this.prisma.payment.count({ where }),
    ]);
  }

  findIdempotent(params: { bookingId: string; provider: PaymentProvider; amount: number; currency: string; key?: string }) {
    // Сейчас без поля idempotencyKey в БД — fallback:
    // 1) если key передали — позже добавим поле и unique индекс
    // 2) пока возвращаем последний pending по booking+provider
    return this.prisma.payment.findFirst({
      where: {
        bookingId: params.bookingId,
        provider: params.provider,
        amount: params.amount,
        currency: params.currency,
        status: 'pending',
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
