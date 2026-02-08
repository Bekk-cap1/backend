import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { createHash, randomInt } from 'crypto';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { AuthStrategiesService } from './strategies/auth.service';
import { OtpPurpose, Role } from '@prisma/client';
import { RedisService } from '../../infrastructure/redis/redis.service';

function normalizePhone(phone: string): string {
  return phone.replace(/\s+/g, '').trim();
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly strategies: AuthStrategiesService,
    private readonly redis: RedisService,
  ) {}

  async register(phone: string, password: string) {
    const normalizedPhone = normalizePhone(phone);
    const existing = await this.prisma.user.findUnique({
      where: { phone: normalizedPhone },
    });
    if (existing) throw new BadRequestException('User already exists');

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: {
        phone: normalizedPhone,
        passwordHash,
        role: Role.passenger,
      },
      select: { id: true, phone: true, role: true },
    });

    return user;
  }

  async validateUser(phone: string, password: string) {
    const normalizedPhone = normalizePhone(phone);
    const user = await this.prisma.user.findUnique({
      where: { phone: normalizedPhone },
      select: { id: true, phone: true, role: true, passwordHash: true },
    });

    if (!user) throw new UnauthorizedException('Invalid credentials');

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    return { id: user.id, phone: user.phone, role: user.role };
  }

  async issueTokens(
    user: { id: string; phone: string; role: Role },
    ua?: string,
    ip?: string,
  ) {
    return this.strategies.issueTokens({
      userId: user.id,
      phone: user.phone,
      role: user.role,
      userAgent: ua,
      ip,
    });
  }

  async refresh(refreshToken: string, ua?: string, ip?: string) {
    return this.strategies.rotateRefresh({
      refreshToken,
      userAgent: ua,
      ip,
    });
  }

  async logout(refreshToken: string) {
    return this.strategies.revokeByRefreshToken(refreshToken);
  }

  async sendOtp(phone: string, purpose: OtpPurpose) {
    const normalizedPhone = normalizePhone(phone);
    const key = `otp:send:${normalizedPhone}`;
    const sent = await this.redis.raw.incr(key);
    if (sent === 1) {
      await this.redis.raw.expire(key, 10 * 60);
    }
    if (sent > 5) {
      throw new HttpException(
        'Too many OTP requests',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const code =
      process.env.NODE_ENV === 'test'
        ? '123456'
        : randomInt(100000, 999999).toString();
    const codeHash = this.hashOtp(code);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await this.prisma.otpCode.create({
      data: {
        phone: normalizedPhone,
        purpose,
        codeHash,
        expiresAt,
      },
    });

    return {
      sent: true,
      expiresAt,
      code: process.env.NODE_ENV === 'test' ? code : undefined,
    };
  }

  async verifyOtp(phone: string, purpose: OtpPurpose, code: string) {
    const normalizedPhone = normalizePhone(phone);
    const otp = await this.prisma.otpCode.findFirst({
      where: {
        phone: normalizedPhone,
        purpose,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!otp) throw new BadRequestException('OTP not found or expired');
    if (otp.attempts >= 5) {
      throw new HttpException('OTP locked', HttpStatus.TOO_MANY_REQUESTS);
    }

    const valid = otp.codeHash === this.hashOtp(code);
    if (!valid) {
      await this.prisma.otpCode.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException('Invalid OTP');
    }

    await this.prisma.otpCode.update({
      where: { id: otp.id },
      data: { consumedAt: new Date() },
    });
    return { ok: true };
  }

  async requestPasswordReset(phone: string) {
    return this.sendOtp(normalizePhone(phone), OtpPurpose.reset_password);
  }

  async confirmPasswordReset(phone: string, code: string, newPassword: string) {
    const normalizedPhone = normalizePhone(phone);
    await this.verifyOtp(normalizedPhone, OtpPurpose.reset_password, code);
    const passwordHash = await bcrypt.hash(newPassword, 10);

    const updated = await this.prisma.user.updateMany({
      where: { phone: normalizedPhone },
      data: { passwordHash },
    });
    if (!updated.count) throw new BadRequestException('User not found');
    return { ok: true };
  }

  async listSessions(userId: string) {
    return this.prisma.userSession.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        userAgent: true,
        ip: true,
        lastUsedAt: true,
        expiresAt: true,
        revokedAt: true,
        createdAt: true,
      },
    });
  }

  async revokeSession(userId: string, sessionId: string) {
    const res = await this.prisma.userSession.updateMany({
      where: { id: sessionId, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (!res.count) throw new BadRequestException('Session not found');
    return { ok: true };
  }

  private hashOtp(code: string) {
    return createHash('sha256').update(code).digest('hex');
  }
}
