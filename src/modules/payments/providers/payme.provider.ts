import { Injectable } from '@nestjs/common';
import { PaymentProvider } from '@prisma/client';
import { PaymentProviderAdapter, CreateIntentResult, WebhookResult } from './payment-provider.interface';

@Injectable()
export class PaymeProvider implements PaymentProviderAdapter {
  readonly provider = PaymentProvider.payme;

  async createIntent(): Promise<CreateIntentResult> {
    return { raw: { stub: true, provider: 'payme' } };
  }

  async verifyAndParseWebhook(params: { headers: Record<string, any>; rawBody: Buffer }): Promise<WebhookResult> {
    return {
      status: 'pending',
      raw: { stub: true, provider: 'payme', headers: params.headers, body: params.rawBody.toString('utf8') },
    };
  }
}
