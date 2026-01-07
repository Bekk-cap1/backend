import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { RequestsService } from './requests.service';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { Role } from '@prisma/client';
import { CreateTripRequestDto } from './dto/create-request.dto';
import { RejectTripRequestDto } from './dto/respond-request.dto';
import type { AuthUser } from '../../../common/types/auth-user';

@UseGuards(JwtAuthGuard)
@Controller('trips/:tripId/requests')
export class RequestsController {
  constructor(private readonly service: RequestsService) {}

  @Post()
  @Roles(Role.passenger)
  create(
    @Param('tripId') tripId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateTripRequestDto,
  ) {
    return this.service.createRequest(user.sub, tripId, dto);
  }

  @Get('me')
  myRequest(@Param('tripId') tripId: string, @CurrentUser() user: AuthUser) {
    return this.service.getMyRequest(user.sub, tripId);
  }

  @Post(':requestId/accept')
  @Roles(Role.driver, Role.admin, Role.moderator)
  accept(
    @Param('tripId') tripId: string,
    @Param('requestId') requestId: string,
    @CurrentUser() user: AuthUser,
  ) {
    const role = user.role;
    if (!role) throw new ForbiddenException('Role is required');
    return this.service.acceptRequest(user.sub, role, tripId, requestId);
  }

  @Post(':requestId/reject')
  @Roles(Role.driver, Role.admin, Role.moderator)
  reject(
    @Param('tripId') tripId: string,
    @Param('requestId') requestId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: RejectTripRequestDto,
  ) {
    const role = user.role;
    if (!role) throw new ForbiddenException('Role is required');
    return this.service.rejectRequest(
      user.sub,
      role,
      tripId,
      requestId,
      dto.reason,
    );
  }
}
