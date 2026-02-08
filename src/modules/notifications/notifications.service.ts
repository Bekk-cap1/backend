import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { NotificationsQueryDto } from './dto/notifications-query.dto';
import { RegisterDeviceDto } from './dto/register-device.dto';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string, query: NotificationsQueryDto) {
    const take = query.limit ?? 20;
    const skip = query.offset ?? 0;

    const where = {
      userId,
      ...(query.unreadOnly ? { readAt: null } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return { items, total, offset: skip, limit: take };
  }

  async markRead(userId: string, id: string) {
    const updated = await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { readAt: new Date() },
    });

    if (updated.count === 0) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.notification.findUnique({ where: { id } });
  }

  async registerDevice(userId: string, dto: RegisterDeviceDto) {
    const existing = await this.prisma.device.findFirst({
      where: { token: dto.token },
      select: { id: true },
    });

    if (existing) {
      return this.prisma.device.update({
        where: { id: existing.id },
        data: {
          userId,
          platform: dto.platform ?? null,
          model: dto.model ?? null,
          token: dto.token,
          lastSeenAt: new Date(),
        },
      });
    }

    return this.prisma.device.create({
      data: {
        userId,
        platform: dto.platform ?? null,
        model: dto.model ?? null,
        token: dto.token,
        lastSeenAt: new Date(),
      },
    });
  }
}
