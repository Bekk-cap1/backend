import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { Role } from '@prisma/client';

type RefreshPayload = {
  sub: string;
  jti: string;
  typ: 'refresh';
  iat?: number;
  exp?: number;
};

@Injectable()
export class AuthStrategiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  private accessTtlSec() {
    return Number(process.env.JWT_ACCESS_TTL ?? 900);
  }

  private accessSecret() {
    return process.env.JWT_ACCESS_SECRET ?? process.env.JWT_SECRET ?? 'dev_access_secret';
  }

  private refreshTtlSec() {
    return Number(process.env.JWT_REFRESH_TTL ?? 2592000);
  }

  private refreshSecret() {
    return process.env.JWT_REFRESH_SECRET ?? process.env.JWT_SECRET ?? 'dev_refresh_secret';
  }

  private signRefreshToken(userId: string) {
    const jti = randomUUID();
    const token = this.jwt.sign(
      { sub: userId, jti, typ: 'refresh' },
      { secret: this.refreshSecret(), expiresIn: this.refreshTtlSec() },
    );
    const expiresAt = new Date(Date.now() + this.refreshTtlSec() * 1000);
    return { token, jti, expiresAt };
  }

  private signAccessToken(params: { userId: string; sessionId: string; phone: string; role: Role }) {
    return this.jwt.sign(
      {
        sub: params.userId,
        sid: params.sessionId,
        phone: params.phone,
        role: params.role,
        typ: 'access',
      },
      { secret: this.accessSecret(), expiresIn: this.accessTtlSec() },
    );
  }

  private verifyRefreshToken(token: string): RefreshPayload {
    try {
      const payload = this.jwt.verify<RefreshPayload>(token, { secret: this.refreshSecret() });

      if (!payload?.sub || !payload?.jti) {
        throw new UnauthorizedException('Invalid refresh token');
      }
      if (payload.typ !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      return payload;
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async createSession(params: {
    userId: string;
    refreshToken: string;
    refreshJti: string;
    expiresAt: Date;
    userAgent?: string | null;
    ip?: string | null;
  }) {
    const refreshTokenHash = await bcrypt.hash(params.refreshToken, 10);

    return this.prisma.userSession.create({
      data: {
        userId: params.userId,
        refreshTokenHash,
        refreshJti: params.refreshJti,
        userAgent: params.userAgent ?? null,
        ip: params.ip ?? null,
        revokedAt: null,
        lastUsedAt: new Date(),
        expiresAt: params.expiresAt,
      },
    });
  }

  async validateRefresh(refreshToken: string) {
    const payload = this.verifyRefreshToken(refreshToken);

    const session = await this.prisma.userSession.findFirst({
      where: {
        userId: payload.sub,
        refreshJti: payload.jti,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: {
        user: { select: { id: true, phone: true, role: true } },
      },
    });

    if (!session) throw new UnauthorizedException('Invalid refresh token');

    const ok = await bcrypt.compare(refreshToken, session.refreshTokenHash);
    if (!ok) throw new UnauthorizedException('Invalid refresh token');

    return { session, user: session.user, payload };
  }

  /**
   * Login: создаём сессию + выдаём access+refresh
   */
  async issueTokens(params: { userId: string; phone: string; role: Role; userAgent?: string; ip?: string }) {
    const { token: refreshToken, jti, expiresAt } = this.signRefreshToken(params.userId);

    const session = await this.createSession({
      userId: params.userId,
      refreshToken,
      refreshJti: jti,
      expiresAt,
      userAgent: params.userAgent ?? null,
      ip: params.ip ?? null,
    });

    const accessToken = this.signAccessToken({
      userId: params.userId,
      sessionId: session.id,
      phone: params.phone,
      role: params.role,
    });

    return {
      accessToken,
      refreshToken,
      expiresAt,
    };
  }

  /**
   * Refresh rotation: обновляем refresh в той же записи, и выдаём новый access
   */
  async rotateRefresh(params: { refreshToken: string; userAgent?: string; ip?: string }) {
    const { session, user } = await this.validateRefresh(params.refreshToken);

    const { token: newRefreshToken, jti: newJti, expiresAt } = this.signRefreshToken(session.userId);
    const newHash = await bcrypt.hash(newRefreshToken, 10);

    const updatedSession = await this.prisma.userSession.update({
      where: { id: session.id },
      data: {
        refreshJti: newJti,
        refreshTokenHash: newHash,
        lastUsedAt: new Date(),
        userAgent: params.userAgent ?? session.userAgent,
        ip: params.ip ?? session.ip,
        expiresAt,
      },
    });

    const accessToken = this.signAccessToken({
      userId: user.id,
      sessionId: updatedSession.id,
      phone: user.phone,
      role: user.role,
    });

    return {
      user,
      accessToken,
      refreshToken: newRefreshToken,
      expiresAt,
    };
  }

  async revokeByRefreshToken(refreshToken: string) {
    const payload = this.verifyRefreshToken(refreshToken);

    await this.prisma.userSession.updateMany({
      where: {
        userId: payload.sub,
        refreshJti: payload.jti,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });

    return { ok: true };
  }

  async revokeAll(userId: string) {
    await this.prisma.userSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return { ok: true };
  }

  assertRole(user: { role: Role }, allowed: Role[]) {
    if (!allowed.includes(user.role)) throw new ForbiddenException('Forbidden');
  }
}
