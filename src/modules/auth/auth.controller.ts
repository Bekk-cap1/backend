import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Ip,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshDto } from './dto/refresh.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import {
  ResetPasswordConfirmDto,
  ResetPasswordRequestDto,
} from './dto/reset-password.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import type { AuthUser } from '../../common/types/auth-user';
import {
  assertCsrf,
  AUTH_REFRESH_COOKIE,
  clearWebAuthCookies,
  parseCookies,
  setWebAuthCookies,
} from './web-auth.util';
import { Role } from '@prisma/client';
import { LoginAttemptsService } from '../../security/login-attempts.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly loginAttempts: LoginAttemptsService,
  ) {}

  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    const user = await this.auth.register(dto.phone, dto.password);
    return { ok: true, data: { user } };
  }

  @Public()
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Headers('user-agent') ua?: string,
    @Ip() ip?: string,
  ) {
    const lockContext = { phone: dto.phone, ip };
    await this.loginAttempts.assertNotLocked(lockContext);

    let user: { id: string; phone: string; role: Role };
    try {
      user = await this.auth.validateUser(dto.phone, dto.password);
    } catch (error) {
      return this.loginAttempts.onFailure(lockContext, error);
    }

    await this.loginAttempts.onSuccess(lockContext);
    const tokens = await this.auth.issueTokens(user, ua, ip);
    return { ok: true, data: { user, ...tokens } };
  }

  @Public()
  @Post('refresh')
  async refresh(
    @Body() dto: RefreshDto,
    @Headers('user-agent') ua?: string,
    @Ip() ip?: string,
  ) {
    const res = await this.auth.refresh(dto.refreshToken, ua, ip);
    return { ok: true, data: res };
  }

  @Public()
  @Post('logout')
  async logout(@Body() dto: RefreshDto) {
    return { ok: true, data: await this.auth.logout(dto.refreshToken) };
  }

  @Public()
  @Post('web/login')
  async webLogin(
    @Body() dto: LoginDto,
    @Headers('user-agent') ua: string | undefined,
    @Ip() ip: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const lockContext = { phone: dto.phone, ip };
    await this.loginAttempts.assertNotLocked(lockContext);

    let user: { id: string; phone: string; role: Role };
    try {
      user = await this.auth.validateUser(dto.phone, dto.password);
    } catch (error) {
      return this.loginAttempts.onFailure(lockContext, error);
    }

    await this.loginAttempts.onSuccess(lockContext);
    if (user.role !== Role.admin && user.role !== Role.moderator) {
      throw new ForbiddenException('Admin role required');
    }

    const tokens = await this.auth.issueTokens(user, ua, ip);
    const csrfToken = randomUUID();
    setWebAuthCookies(res, {
      refreshToken: tokens.refreshToken,
      csrfToken,
    });

    return {
      ok: true,
      data: { user, accessToken: tokens.accessToken, csrfToken },
    };
  }

  @Public()
  @Post('web/refresh')
  async webRefresh(
    @Req() req: Request,
    @Headers('user-agent') ua: string | undefined,
    @Ip() ip: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    assertCsrf(req);
    const cookies = parseCookies(req);
    const refreshToken = cookies[AUTH_REFRESH_COOKIE];
    if (!refreshToken) {
      throw new ForbiddenException('Refresh token cookie not found');
    }

    const rotated = await this.auth.refresh(refreshToken, ua, ip);
    const csrfToken = randomUUID();
    setWebAuthCookies(res, {
      refreshToken: rotated.refreshToken,
      csrfToken,
    });

    return {
      ok: true,
      data: { user: rotated.user, accessToken: rotated.accessToken, csrfToken },
    };
  }

  @Public()
  @Post('web/logout')
  async webLogout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    assertCsrf(req);
    const cookies = parseCookies(req);
    const refreshToken = cookies[AUTH_REFRESH_COOKIE];
    if (refreshToken) {
      await this.auth.logout(refreshToken);
    }
    clearWebAuthCookies(res);
    return { ok: true, data: { ok: true } };
  }

  @Public()
  @Post('otp/send')
  async sendOtp(@Body() dto: SendOtpDto) {
    return {
      ok: true,
      data: await this.auth.sendOtp(dto.phone, dto.purpose),
    };
  }

  @Public()
  @Post('otp/verify')
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return {
      ok: true,
      data: await this.auth.verifyOtp(dto.phone, dto.purpose, dto.code),
    };
  }

  @Public()
  @Post('password/reset/request')
  async requestPasswordReset(@Body() dto: ResetPasswordRequestDto) {
    return {
      ok: true,
      data: await this.auth.requestPasswordReset(dto.phone),
    };
  }

  @Public()
  @Post('password/reset/confirm')
  async confirmPasswordReset(@Body() dto: ResetPasswordConfirmDto) {
    return {
      ok: true,
      data: await this.auth.confirmPasswordReset(
        dto.phone,
        dto.code,
        dto.newPassword,
      ),
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return { ok: true, data: { user } };
  }

  @UseGuards(JwtAuthGuard)
  @Get('sessions')
  async sessions(@CurrentUser() user: AuthUser) {
    return { ok: true, data: await this.auth.listSessions(user.sub) };
  }

  @UseGuards(JwtAuthGuard)
  @Delete('sessions/:id')
  async revokeSession(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return { ok: true, data: await this.auth.revokeSession(user.sub, id) };
  }
}
