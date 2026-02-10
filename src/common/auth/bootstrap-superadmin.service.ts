import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { Role } from '@prisma/client';

function normalizePhone(phone: string): string {
  return phone.replace(/\s+/g, '').trim();
}

@Injectable()
export class BootstrapSuperadminService implements OnModuleInit {
  private readonly logger = new Logger(BootstrapSuperadminService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    const phoneRaw = process.env.BOOTSTRAP_SUPERADMIN_PHONE?.trim();
    const password = process.env.BOOTSTRAP_SUPERADMIN_PASSWORD?.trim();
    if (!phoneRaw || !password) return;

    const phone = normalizePhone(phoneRaw);
    if (!phone || password.length < 8) {
      this.logger.warn(
        'Skipped bootstrap superadmin: invalid BOOTSTRAP_SUPERADMIN_* values',
      );
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.upsert({
      where: { phone },
      update: {
        role: Role.superadmin,
        passwordHash,
        isBanned: false,
        bannedAt: null,
        banReason: null,
      },
      create: {
        phone,
        passwordHash,
        role: Role.superadmin,
      },
      select: { id: true, phone: true, role: true },
    });

    this.logger.warn(
      `Bootstrap SUPERADMIN ensured for ${user.phone}. Remove BOOTSTRAP_SUPERADMIN_* env vars in production.`,
    );
  }
}
