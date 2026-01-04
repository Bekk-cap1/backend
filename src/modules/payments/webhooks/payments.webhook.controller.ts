import { Controller, Headers, Param, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { PaymentsService } from '../payments.service';
import { Public } from '../../../common/decorators/public.decorator';
import { PaymentProvider } from '@prisma/client';

@Public()
@Controller('payments/webhooks')
export class PaymentsWebhookController {
  constructor(private readonly payments: PaymentsService) {}

  @Post(':provider')
  async handle(
    @Param('provider') provider: PaymentProvider,
    @Headers() headers: Record<string, any>,
    @Req() req: Request & { rawBody?: Buffer },
  ) {
    const rawBody = req.rawBody ?? Buffer.from(JSON.stringify(req.body ?? {}));
    return this.payments.handleWebhook(provider, headers, rawBody);
  }
}
