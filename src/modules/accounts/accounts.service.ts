import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        phone: true,
        role: true,
        profile: true,
        createdAt: true,
      },
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async upsertProfile(
    userId: string,
    data: { fullName?: string; avatarUrl?: string; language?: string },
  ) {
    return this.prisma.userProfile.upsert({
      where: { userId },
      create: { userId, ...data },
      update: { ...data },
    });
  }
}
