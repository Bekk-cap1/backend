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
import { OffersService } from '../../offers/offers.service';
import { CreateOfferDto } from '../../offers/dto/create-offer.dto';
import type { AuthUser } from '../../../common/types/auth-user';

@UseGuards(JwtAuthGuard)
@Controller('requests')
export class RequestsByIdController {
  constructor(
    private readonly service: RequestsService,
    private readonly offers: OffersService,
  ) {}

  @Get('my')
  @Roles(Role.passenger)
  listMine(@CurrentUser() user: AuthUser) {
    return this.service.listMyRequests(user.sub);
  }

  @Post(':requestId/cancel')
  @Roles(Role.passenger)
  cancel(@Param('requestId') requestId: string, @CurrentUser() user: AuthUser) {
    return this.service.cancelRequest(user.sub, requestId);
  }

  @Get(':requestId/negotiation')
  @Roles(Role.driver, Role.passenger)
  getNegotiation(
    @Param('requestId') requestId: string,
    @CurrentUser() user: AuthUser,
  ) {
    const role = user.role;
    if (!role) throw new ForbiddenException('Role is required');
    return this.service.getNegotiationSession(user.sub, role, requestId);
  }

  @Get(':requestId/offers')
  @Roles(Role.driver, Role.passenger)
  listOffers(
    @Param('requestId') requestId: string,
    @CurrentUser() user: AuthUser,
  ) {
    const role = user.role;
    if (!role) throw new ForbiddenException('Role is required');
    return this.offers.listForRequest(user.sub, role, requestId);
  }

  @Post(':requestId/offers')
  @Roles(Role.driver, Role.passenger)
  createOffer(
    @Param('requestId') requestId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateOfferDto,
  ) {
    const role = user.role;
    if (!role) throw new ForbiddenException('Role is required');
    return this.offers.createOffer(user.sub, role, requestId, dto);
  }
}
