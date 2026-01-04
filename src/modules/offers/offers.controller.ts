import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

import { OffersService } from './offers.service';
import { CreateOfferDto } from './dto/create-offer.dto';
import { AcceptOfferDto } from './dto/accept-offer.dto';
import { RejectOfferDto } from './dto/reject-offer.dto';

@Controller('offers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OffersController {
  constructor(private readonly offers: OffersService) {}

  // список offers по request (видят участники + водитель поездки)
  @Get('requests/:requestId')
  @Roles('driver', 'passenger')
  list(@CurrentUser() user: any, @Param('requestId') requestId: string) {
    const userId = user.sub ?? user.id;
    const role = user.role;
    return this.offers.listForRequest(userId, role, requestId);
  }

  // создать offer по request (и driver, и passenger)
  @Post('requests/:requestId')
  @Roles('driver', 'passenger')
  create(
    @CurrentUser() user: any,
    @Param('requestId') requestId: string,
    @Body() dto: CreateOfferDto,
  ) {
    const userId = user.sub ?? user.id;
    const role = user.role;
    return this.offers.createOffer(userId, role, requestId, dto);
  }

  // accept offer (принимает противоположная сторона)
  @Patch(':offerId/accept')
  @Roles('driver', 'passenger')
  accept(
    @CurrentUser() user: any,
    @Param('offerId') offerId: string,
    @Body() dto: AcceptOfferDto,
  ) {
    const userId = user.sub ?? user.id;
    const role = user.role;
    return this.offers.acceptOffer(userId, role, offerId, dto);
  }

  // reject offer (тоже противоположная сторона)
  @Patch(':offerId/reject')
  @Roles('driver', 'passenger')
  reject(
    @CurrentUser() user: any,
    @Param('offerId') offerId: string,
    @Body() dto: RejectOfferDto,
  ) {
    const userId = user.sub ?? user.id;
    const role = user.role;
    return this.offers.rejectOffer(userId, role, offerId, dto);
  }

  // cancel offer (только автор)
  @Patch(':offerId/cancel')
  @Roles('driver', 'passenger')
  cancel(@CurrentUser() user: any, @Param('offerId') offerId: string) {
    const userId = user.sub ?? user.id;
    const role = user.role;
    return this.offers.cancelOffer(userId, role, offerId);
  }
}
