import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { RedisService } from '../infrastructure/redis/redis.service';

type LoginLockContext = {
  phone: string;
  ip?: string;
};

function normalizePhone(phone: string): string {
  return phone.replace(/\s+/g, '').trim();
}

function normalizeIp(ip?: string): string {
  if (!ip) return 'unknown';
  return ip.trim().toLowerCase();
}

@Injectable()
export class LoginAttemptsService {
  private readonly maxAttempts = Number(
    process.env.LOGIN_LOCK_MAX_ATTEMPTS ?? 5,
  );
  private readonly windowSec = Number(process.env.LOGIN_LOCK_WINDOW_SEC ?? 600);

  constructor(private readonly redis: RedisService) {}

  async assertNotLocked(context: LoginLockContext): Promise<void> {
    const [phoneAttempts, phoneIpAttempts] = await this.getAttempts(context);
    if (
      phoneAttempts >= this.maxAttempts ||
      phoneIpAttempts >= this.maxAttempts
    ) {
      throw new HttpException(
        `Too many failed login attempts. Try again in ${this.windowSec} seconds.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  async onSuccess(context: LoginLockContext): Promise<void> {
    const keys = this.keys(context);
    if (keys.length > 0) {
      await this.redis.raw.del(...keys);
    }
  }

  async onFailure(context: LoginLockContext, error: unknown): Promise<never> {
    if (!(error instanceof UnauthorizedException)) {
      throw error;
    }

    for (const key of this.keys(context)) {
      const attempts = await this.redis.raw.incr(key);
      if (attempts === 1) {
        await this.redis.raw.expire(key, this.windowSec);
      }
    }

    await this.assertNotLocked(context);
    throw error;
  }

  private async getAttempts(
    context: LoginLockContext,
  ): Promise<[number, number]> {
    const [phoneKey, phoneIpKey] = this.keys(context);
    const values = await this.redis.raw.mget(phoneKey, phoneIpKey);
    const phoneAttempts = Number(values?.[0] ?? 0);
    const phoneIpAttempts = Number(values?.[1] ?? 0);
    return [phoneAttempts, phoneIpAttempts];
  }

  private keys(context: LoginLockContext): [string, string] {
    const phoneHash = createHash('sha256')
      .update(normalizePhone(context.phone))
      .digest('hex');
    const phoneIpHash = createHash('sha256')
      .update(`${normalizePhone(context.phone)}:${normalizeIp(context.ip)}`)
      .digest('hex');
    return [
      `auth:login:fail:phone:${phoneHash}`,
      `auth:login:fail:phone-ip:${phoneIpHash}`,
    ];
  }
}
