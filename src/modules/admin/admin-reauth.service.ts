import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { RedisService } from '../../infrastructure/redis/redis.service';

type AdminConfirmPayload = {
  userId: string;
  role: string;
  issuedAt: string;
};

@Injectable()
export class AdminReauthService {
  private readonly ttlSec = Number(process.env.ADMIN_REAUTH_TTL_SEC ?? 300);
  private readonly redisPrefix = 'admin:confirm';

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async issueConfirmToken(params: { userId: string; password: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: params.userId },
      select: { id: true, role: true, passwordHash: true },
    });
    if (!user) throw new UnauthorizedException('User not found');

    const ok = await bcrypt.compare(params.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    const confirmToken = randomUUID();
    const key = this.key(confirmToken);
    const payload: AdminConfirmPayload = {
      userId: user.id,
      role: user.role,
      issuedAt: new Date().toISOString(),
    };

    await this.redis.raw.set(key, JSON.stringify(payload), 'EX', this.ttlSec);

    return {
      confirmToken,
      expiresAt: new Date(Date.now() + this.ttlSec * 1000).toISOString(),
    };
  }

  async assertAndConsumeToken(params: {
    userId: string;
    confirmToken?: string;
  }) {
    const token = params.confirmToken?.trim();
    if (!token) throw new ForbiddenException('X-Admin-Confirm header required');

    const key = this.key(token);
    const raw = await this.redis.raw.get(key);
    if (!raw) throw new ForbiddenException('Admin confirm token expired');

    let payload: AdminConfirmPayload;
    try {
      payload = JSON.parse(raw) as AdminConfirmPayload;
    } catch {
      await this.redis.raw.del(key);
      throw new ForbiddenException('Invalid admin confirm token');
    }

    if (payload.userId !== params.userId) {
      throw new ForbiddenException(
        'Admin confirm token belongs to another user',
      );
    }

    await this.redis.raw.del(key);
    return payload;
  }

  private key(token: string) {
    return `${this.redisPrefix}:${token}`;
  }
}
