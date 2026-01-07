import { Injectable } from '@nestjs/common';
import { PaymentProvider } from '@prisma/client';
import {
  PaymentProviderAdapter,
  CreateIntentResult,
  WebhookResult,
} from './payment-provider.interface';

@Injectable()
export class StripeProvider implements PaymentProviderAdapter {
  readonly provider = PaymentProvider.stripe;

  createIntent(): Promise<CreateIntentResult> {
    return Promise.resolve({ raw: { stub: true, provider: 'stripe' } });
  }

  verifyAndParseWebhook(params: {
    headers: Record<string, string | string[] | undefined>;
    rawBody: Buffer;
  }): Promise<WebhookResult> {
    return Promise.resolve({
      status: 'pending',
      raw: {
        stub: true,
        provider: 'stripe',
        headers: params.headers,
        body: params.rawBody.toString('utf8'),
      },
    });
  }
}
