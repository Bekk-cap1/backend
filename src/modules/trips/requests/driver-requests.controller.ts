import { Controller, Get, UseGuards } from '@nestjs/common';
import { RequestsService } from './requests.service';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { Role } from '@prisma/client';

@UseGuards(JwtAuthGuard)
@Controller('driver/requests')
export class DriverRequestsController {
  constructor(private readonly service: RequestsService) {}

  @Get()
  @Roles(Role.driver, Role.admin, Role.moderator)
  list(@CurrentUser() user: any) {
    return this.service.listDriverRequests(user.sub ?? user.id, user.role);
  }
}
