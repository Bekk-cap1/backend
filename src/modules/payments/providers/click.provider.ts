import { Injectable } from '@nestjs/common';
import { PaymentProvider } from '@prisma/client';
import {
  PaymentProviderAdapter,
  CreateIntentResult,
  WebhookResult,
} from './payment-provider.interface';

@Injectable()
export class ClickProvider implements PaymentProviderAdapter {
  readonly provider = PaymentProvider.click;

  createIntent(): Promise<CreateIntentResult> {
    // TODO: позже добавим генерацию счета/URL по API Click
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
    // TODO: позже — проверка подписи (секрет из env)
    // Сейчас просто шаблон
    return Promise.resolve({
      status: 'pending',
      raw: {
        stub: true,
        provider: 'click',
        headers: params.headers,
        body: params.rawBody.toString('utf8'),
      },
    });
  }
}
