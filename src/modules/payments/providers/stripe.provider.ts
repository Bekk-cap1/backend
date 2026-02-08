import { Injectable } from '@nestjs/common';
import { PaymentProvider } from '@prisma/client';
import {
  PaymentProviderAdapter,
  CreateIntentResult,
  WebhookResult,
} from './payment-provider.interface';
import { verifyWebhookHmac } from './webhook-signature.util';

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
    verifyWebhookHmac({
      provider: 'stripe',
      headers: params.headers,
      rawBody: params.rawBody,
      secret:
        process.env.STRIPE_WEBHOOK_SECRET ?? process.env.PAYMENT_WEBHOOK_SECRET,
      signatureHeaders: ['stripe-signature', 'x-stripe-signature'],
    });

    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(params.rawBody.toString('utf8')) as Record<
        string,
        unknown
      >;
    } catch {
      // keep empty payload
    }

    return Promise.resolve({
      externalId:
        typeof parsed.externalId === 'string' ? parsed.externalId : undefined,
      externalEventId:
        typeof parsed.externalEventId === 'string'
          ? parsed.externalEventId
          : undefined,
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
