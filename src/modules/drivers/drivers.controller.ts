import { Body, Controller, Get, Post } from '@nestjs/common';
import { DriversService } from './drivers.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UpsertDriverProfileDto } from './dto/upsert-driver-profile.dto';

@Controller('drivers')
export class DriversController {
  constructor(private readonly drivers: DriversService) {}

  @Get('me')
  me(@CurrentUser() user: any) {
    const userId = user.id ?? user.sub;
    return this.drivers.getMe(userId);
  }

  @Post('profile')
  upsert(@CurrentUser() user: any, @Body() dto: UpsertDriverProfileDto) {
    const userId = user.id ?? user.sub;
    return this.drivers.upsert(userId, dto);
  }

  @Post('submit')
  submit(@CurrentUser() user: any) {
    const userId = user.id ?? user.sub;
    return this.drivers.submit(userId);
  }
}
