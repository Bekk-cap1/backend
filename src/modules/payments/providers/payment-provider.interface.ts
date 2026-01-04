import { PaymentProvider } from '@prisma/client';

export type CreateIntentResult = {
  // например, ссылка на оплату / параметры формы / qr
  redirectUrl?: string;
  form?: Record<string, string>;
  raw?: any;
};

export type WebhookResult = {
  // что произошло с платежом
  externalId?: string;
  externalEventId?: string;
  status?: 'created' | 'pending' | 'paid' | 'failed' | 'refunded' | 'succeeded' | 'canceled';
  amount?: number;
  currency?: string;
  raw?: any;
};

export interface PaymentProviderAdapter {
  readonly provider: PaymentProvider;

  /**
   * Создать intent / invoice / checkout URL.
   * Здесь только формируем данные. DB-статусы и бизнес-правила — в PaymentsService.
   */
  createIntent(params: {
    paymentId: string;
    amount: number;
    currency: string;
    description?: string | null;
    customer?: { userId: string; phone: string };
    metadata?: Record<string, any>;
  }): Promise<CreateIntentResult>;

  /**
   * Проверка и парсинг webhook.
   * verifySignature обязателен: здесь мы валидируем подпись/секрет.
   */
  verifyAndParseWebhook(params: {
    headers: Record<string, string | string[] | undefined>;
    rawBody: Buffer;
  }): Promise<WebhookResult>;
}
