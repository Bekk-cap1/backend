import { Body, Controller, Get, Headers, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { ListPaymentsDto } from './dto/list-payments.dto';
import { PaymentWebhookDto } from './dto/payment-webhook.dto';
import { Public } from '../../common/decorators/public.decorator';

@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('create-intent')
  createIntent(
    @CurrentUser() user: any,
    @Body() dto: CreatePaymentIntentDto,
  ) {
    return this.payments.createIntent(user.sub ?? user.id, dto);
  }

  @Get('me')
  listMy(@CurrentUser() user: any, @Query() q: ListPaymentsDto) {
    return this.payments.listMy(user.sub ?? user.id, q);
  }

  @Get(':id')
  getById(@CurrentUser() user: any, @Param('id') id: string) {
    return this.payments.getById(user.sub ?? user.id, id);
  }

  @Public()
  @Post('webhook')
  handleWebhook(
    @Body() dto: PaymentWebhookDto,
    @Headers() headers: Record<string, any>,
    @Req() req: Request & { rawBody?: Buffer },
  ) {
    const rawBody = req.rawBody ?? Buffer.from(JSON.stringify(req.body ?? {}));
    return this.payments.handleWebhook(dto.provider, headers, rawBody);
  }
}
