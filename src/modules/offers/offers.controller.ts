import {
  Body,
  ForbiddenException,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types/auth-user';

import { OffersService } from './offers.service';
import { CreateOfferDto } from './dto/create-offer.dto';
import { AcceptOfferDto } from './dto/accept-offer.dto';
import { RejectOfferDto } from './dto/reject-offer.dto';

@Controller('offers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OffersController {
  constructor(private readonly offers: OffersService) {}

  // Create offer for a request
  @Get('requests/:requestId')
  @Roles('driver', 'passenger')
  list(@CurrentUser() user: AuthUser, @Param('requestId') requestId: string) {
    const userId = user.sub;
    const role = user.role;
    if (!role) throw new ForbiddenException('Role is required');
    return this.offers.listForRequest(userId, role, requestId);
  }

  // создать offer по request (и driver, и passenger)
  @Post('requests/:requestId')
  @Roles('driver', 'passenger')
  create(
    @CurrentUser() user: AuthUser,
    @Param('requestId') requestId: string,
    @Body() dto: CreateOfferDto,
  ) {
    const userId = user.sub;
    const role = user.role;
    if (!role) throw new ForbiddenException('Role is required');
    return this.offers.createOffer(userId, role, requestId, dto);
  }

  // Accept offer
  @Patch(':offerId/accept')
  @Roles('driver', 'passenger')
  accept(
    @CurrentUser() user: AuthUser,
    @Param('offerId') offerId: string,
    @Body() dto: AcceptOfferDto,
  ) {
    const userId = user.sub;
    const role = user.role;
    if (!role) throw new ForbiddenException('Role is required');
    return this.offers.acceptOffer(userId, role, offerId, dto);
  }

  // Reject offer
  @Patch(':offerId/reject')
  @Roles('driver', 'passenger')
  reject(
    @CurrentUser() user: AuthUser,
    @Param('offerId') offerId: string,
    @Body() dto: RejectOfferDto,
  ) {
    const userId = user.sub;
    const role = user.role;
    if (!role) throw new ForbiddenException('Role is required');
    return this.offers.rejectOffer(userId, role, offerId, dto);
  }

  // Cancel offer
  @Patch(':offerId/cancel')
  @Roles('driver', 'passenger')
  cancel(@CurrentUser() user: AuthUser, @Param('offerId') offerId: string) {
    const userId = user.sub;
    const role = user.role;
    if (!role) throw new ForbiddenException('Role is required');
    return this.offers.cancelOffer(userId, role, offerId);
  }
}
