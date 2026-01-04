import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { AuthStrategiesService } from './strategies/auth.service';
import { Role } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly strategies: AuthStrategiesService,
  ) {}

  async register(phone: string, password: string) {
    const existing = await this.prisma.user.findUnique({ where: { phone } });
    if (existing) throw new BadRequestException('User already exists');

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: {
        phone,
        passwordHash,
        role: Role.passenger, // по умолчанию
      },
      select: { id: true, phone: true, role: true },
    });

    return user;
  }

  async validateUser(phone: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { phone },
      select: { id: true, phone: true, role: true, passwordHash: true },
    });

    if (!user) throw new UnauthorizedException('Invalid credentials');

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    return { id: user.id, phone: user.phone, role: user.role };
  }

  async issueTokens(user: { id: string; phone: string; role: Role }, ua?: string, ip?: string) {
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
}
