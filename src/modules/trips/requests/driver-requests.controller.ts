import { Controller, ForbiddenException, Get, UseGuards } from '@nestjs/common';
import { RequestsService } from './requests.service';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { Role } from '@prisma/client';
import type { AuthUser } from '../../../common/types/auth-user';

@UseGuards(JwtAuthGuard)
@Controller('driver/requests')
export class DriverRequestsController {
  constructor(private readonly service: RequestsService) {}

  @Get()
  @Roles(Role.driver, Role.admin, Role.moderator)
  list(@CurrentUser() user: AuthUser) {
    const role = user.role;
    if (!role) throw new ForbiddenException('Role is required');
    return this.service.listDriverRequests(user.sub, role);
  }
}
