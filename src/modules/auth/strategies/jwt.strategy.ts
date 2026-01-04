import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

type AccessPayload = {
  sub: string;   // userId
  sid: string;   // sessionId
  phone?: string;
  role?: string;
  typ?: 'access';
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const secret =
      config.get<string>('JWT_ACCESS_SECRET') ??
      config.get<string>('JWT_SECRET') ??
      'dev_access_secret';

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: secret,
      ignoreExpiration: false,
    });
  }

  async validate(payload: AccessPayload) {
    // Если хочешь, оставь это на время отладки:
    // this.logger.log(`payload=${JSON.stringify(payload)}`);

    if (!payload?.sub) throw new UnauthorizedException('Invalid token payload');

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        phone: true,
        role: true,
        profile: true,
      },
    });

    if (!user) throw new UnauthorizedException('User not found');

    return {
      sub: user.id,
      phone: user.phone,
      role: user.role,
      profile: user.profile,
      sid: payload.sid,
    };
  }
}
