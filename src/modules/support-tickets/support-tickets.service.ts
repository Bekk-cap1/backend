import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { OutboxService } from '../../outbox/outbox.service';
import { OutboxTopic } from '../../outbox/outbox.topics';
import { CreateTicketDto } from './dto/create-ticket.dto';

@Injectable()
export class SupportTicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
  ) {}

  async create(userId: string, dto: CreateTicketDto) {
    if (dto.bookingId) {
      const booking = await this.prisma.booking.findUnique({
        where: { id: dto.bookingId },
        select: { passengerId: true },
      });
      if (!booking || booking.passengerId !== userId) {
        throw new ForbiddenException('Booking access denied');
      }
    }

    const ticket = await this.prisma.supportTicket.create({
      data: {
        userId,
        bookingId: dto.bookingId ?? null,
        subject: dto.subject,
        message: dto.message,
      },
    });

    await this.outbox.enqueue({
      topic: OutboxTopic.SupportTicketCreated,
      aggregateType: 'supportTicket',
      aggregateId: ticket.id,
      idempotencyKey: `supportTicket:${ticket.id}:created`,
      payload: {
        ticketId: ticket.id,
        userId,
        bookingId: dto.bookingId ?? null,
        subject: dto.subject,
      },
    });

    return ticket;
  }

  async listMine(userId: string) {
    return this.prisma.supportTicket.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
