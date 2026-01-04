import { Injectable } from '@nestjs/common';
import { PaymentProvider } from '@prisma/client';
import { PaymentProviderAdapter, CreateIntentResult, WebhookResult } from './payment-provider.interface';

@Injectable()
export class StripeProvider implements PaymentProviderAdapter {
  readonly provider = PaymentProvider.stripe;

  async createIntent(): Promise<CreateIntentResult> {
    return { raw: { stub: true, provider: 'stripe' } };
  }

  async verifyAndParseWebhook(params: { headers: Record<string, any>; rawBody: Buffer }): Promise<WebhookResult> {
    return {
      status: 'pending',
      raw: { stub: true, provider: 'stripe', headers: params.headers, body: params.rawBody.toString('utf8') },
    };
  }
}
