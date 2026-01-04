import { Body, Controller, Get, Headers, Ip, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshDto } from './dto/refresh.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

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
    const user = await this.auth.validateUser(dto.phone, dto.password);
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

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: any) {
    return { ok: true, data: { user } };
  }
}
