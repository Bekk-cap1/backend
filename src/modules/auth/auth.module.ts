import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthStrategiesService } from './strategies/auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';

@Module({
  imports: [
    ConfigModule, // важно
    PrismaModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => {
        // JwtService по умолчанию будет иметь access секрет,
        // но мы всё равно в refresh/sign/verify передаём секрет явно.
        const secret =
          cfg.get<string>('JWT_ACCESS_SECRET') ??
          cfg.get<string>('JWT_SECRET') ??
          'dev_access_secret';

        const ttl = cfg.get<number>('JWT_ACCESS_TTL', 900);

        return {
          secret,
          signOptions: { expiresIn: ttl },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthStrategiesService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
