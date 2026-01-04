import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { RequestsService } from './requests.service';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { Role } from '@prisma/client';
import { CreateTripRequestDto } from './dto/create-request.dto';
import { RejectTripRequestDto } from './dto/respond-request.dto';

@UseGuards(JwtAuthGuard)
@Controller('trips/:tripId/requests')
export class RequestsController {
  constructor(private readonly service: RequestsService) {}

  @Post()
  @Roles(Role.passenger)
  create(
    @Param('tripId') tripId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateTripRequestDto,
  ) {
    return this.service.createRequest(user.id, tripId, dto);
  }

  @Get('me')
  myRequest(@Param('tripId') tripId: string, @CurrentUser() user: any) {
    return this.service.getMyRequest(user.id, tripId);
  }

  @Post(':requestId/accept')
  @Roles(Role.driver, Role.admin, Role.moderator)
  accept(
    @Param('tripId') tripId: string,
    @Param('requestId') requestId: string,
    @CurrentUser() user: any,
  ) {
    return this.service.acceptRequest(user.id, user.role, tripId, requestId);
  }

  @Post(':requestId/reject')
  @Roles(Role.driver, Role.admin, Role.moderator)
  reject(
    @Param('tripId') tripId: string,
    @Param('requestId') requestId: string,
    @CurrentUser() user: any,
    @Body() dto: RejectTripRequestDto,
  ) {
    return this.service.rejectRequest(user.id, user.role, tripId, requestId, dto.reason);
  }
}
