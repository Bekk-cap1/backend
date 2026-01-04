import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { ListPaymentsDto } from './dto/list-payments.dto';

@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('booking/:bookingId/intent')
  createIntent(
    @CurrentUser() user: any,
    @Param('bookingId') bookingId: string,
    @Body() dto: CreatePaymentIntentDto,
  ) {
    return this.payments.createIntent(user.sub ?? user.id, bookingId, dto);
  }

  @Get('me')
  listMy(@CurrentUser() user: any, @Query() q: ListPaymentsDto) {
    return this.payments.listMy(user.sub ?? user.id, q);
  }
}
