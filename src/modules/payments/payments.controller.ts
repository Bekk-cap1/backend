import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { ListPaymentsDto } from './dto/list-payments.dto';
import { MarkPaymentPaidDto } from './dto/mark-payment-paid.dto';
import { PaymentQuoteDto } from './dto/payment-quote.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { AuthUser } from '../../common/types/auth-user';

@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('booking/:bookingId/intent')
  createIntent(
    @CurrentUser() user: AuthUser,
    @Param('bookingId') bookingId: string,
    @Body() dto: CreatePaymentIntentDto,
  ) {
    return this.payments.createIntent(user.sub, bookingId, dto);
  }

  @Post('quote')
  quote(@CurrentUser() user: AuthUser, @Body() dto: PaymentQuoteDto) {
    return this.payments.quote(user.sub, dto);
  }

  @Get('me')
  listMy(@CurrentUser() user: AuthUser, @Query() q: ListPaymentsDto) {
    return this.payments.listMy(user.sub, q);
  }

  @Get('quotes/me')
  listMyQuotes(@CurrentUser() user: AuthUser) {
    return this.payments.listMyQuotes(user.sub);
  }

  @Post(':paymentId/mark-paid')
  @UseGuards(RolesGuard)
  @Roles('admin', 'moderator')
  markPaid(
    @Param('paymentId') paymentId: string,
    @Body() dto: MarkPaymentPaidDto,
  ) {
    return this.payments.markPaid(paymentId, dto.note, dto.idempotencyKey);
  }
}
