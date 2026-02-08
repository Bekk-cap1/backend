import { Injectable } from '@nestjs/common';
import { PaymentProvider } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import {
  PaymentProviderAdapter,
  CreateIntentResult,
  WebhookResult,
} from './payment-provider.interface';
import { verifyWebhookHmac } from './webhook-signature.util';

type WebhookStatus = NonNullable<WebhookResult['status']>;

@Injectable()
export class ClickProvider implements PaymentProviderAdapter {
  readonly provider = PaymentProvider.click;

  createIntent(): Promise<CreateIntentResult> {
    return Promise.resolve({
      redirectUrl: undefined,
      form: undefined,
      raw: { stub: true, provider: 'click' },
    });
  }

  verifyAndParseWebhook(params: {
    headers: Record<string, string | string[] | undefined>;
    rawBody: Buffer;
  }): Promise<WebhookResult> {
    verifyWebhookHmac({
      provider: 'click',
      headers: params.headers,
      rawBody: params.rawBody,
      secret:
        process.env.CLICK_WEBHOOK_SECRET ?? process.env.PAYMENT_WEBHOOK_SECRET,
      signatureHeaders: ['x-click-signature'],
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

    const status = normalizeStatus(parsed.status);
    const externalId =
      typeof parsed.externalId === 'string' ? parsed.externalId : undefined;
    const externalEventId =
      typeof parsed.externalEventId === 'string'
        ? parsed.externalEventId
        : undefined;

    const raw: Prisma.InputJsonValue = {
      stub: true,
      provider: 'click',
      body: params.rawBody.toString('utf8'),
    };

    return Promise.resolve({
      status,
      externalId,
      externalEventId,
      raw,
    });
  }
}

function normalizeStatus(value: unknown): WebhookStatus {
  if (
    value === 'created' ||
    value === 'pending' ||
    value === 'paid' ||
    value === 'failed' ||
    value === 'refunded' ||
    value === 'succeeded' ||
    value === 'canceled'
  ) {
    return value;
  }
  return 'pending';
}
