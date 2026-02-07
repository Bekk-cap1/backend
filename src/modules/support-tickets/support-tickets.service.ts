import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { CreateTicketDto } from './dto/create-ticket.dto';

@Injectable()
export class SupportTicketsService {
  constructor(private readonly prisma: PrismaService) {}

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

    return this.prisma.supportTicket.create({
      data: {
        userId,
        bookingId: dto.bookingId ?? null,
        subject: dto.subject,
        message: dto.message,
      },
    });
  }

  async listMine(userId: string) {
    return this.prisma.supportTicket.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
