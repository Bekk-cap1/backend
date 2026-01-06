import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { RequestsService } from './requests.service';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { Role } from '@prisma/client';
import { OffersService } from '../../offers/offers.service';
import { CreateOfferDto } from '../../offers/dto/create-offer.dto';

@UseGuards(JwtAuthGuard)
@Controller('requests')
export class RequestsByIdController {
  constructor(
    private readonly service: RequestsService,
    private readonly offers: OffersService,
  ) {}

  @Get('my')
  @Roles(Role.passenger)
  listMine(@CurrentUser() user: any) {
    return this.service.listMyRequests(user.sub ?? user.id);
  }

  @Post(':requestId/cancel')
  @Roles(Role.passenger)
  cancel(@Param('requestId') requestId: string, @CurrentUser() user: any) {
    return this.service.cancelRequest(user.sub ?? user.id, requestId);
  }

  @Get(':requestId/negotiation')
  @Roles(Role.driver, Role.passenger)
  getNegotiation(@Param('requestId') requestId: string, @CurrentUser() user: any) {
    return this.service.getNegotiationSession(user.sub ?? user.id, user.role, requestId);
  }

  @Get(':requestId/offers')
  @Roles(Role.driver, Role.passenger)
  listOffers(@Param('requestId') requestId: string, @CurrentUser() user: any) {
    return this.offers.listForRequest(user.sub ?? user.id, user.role, requestId);
  }

  @Post(':requestId/offers')
  @Roles(Role.driver, Role.passenger)
  createOffer(
    @Param('requestId') requestId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateOfferDto,
  ) {
    return this.offers.createOffer(user.sub ?? user.id, user.role, requestId, dto);
  }
}
