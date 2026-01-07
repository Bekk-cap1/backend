import { Body, Controller, Get, Post } from '@nestjs/common';
import { DriversService } from './drivers.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UpsertDriverProfileDto } from './dto/upsert-driver-profile.dto';
import type { AuthUser } from '../../common/types/auth-user';

@Controller('drivers')
export class DriversController {
  constructor(private readonly drivers: DriversService) {}

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.drivers.getMe(user.sub);
  }

  @Post('profile')
  upsert(@CurrentUser() user: AuthUser, @Body() dto: UpsertDriverProfileDto) {
    return this.drivers.upsert(user.sub, dto);
  }

  @Post('submit')
  submit(@CurrentUser() user: AuthUser) {
    return this.drivers.submit(user.sub);
  }
}
