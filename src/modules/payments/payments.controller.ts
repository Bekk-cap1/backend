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
import { PaymentQuoteDto } from './dto/payment-quote.dto';
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
}
