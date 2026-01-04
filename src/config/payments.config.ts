import { registerAs } from '@nestjs/config';

export const paymentsConfig = registerAs('payments', () => ({
  provider: process.env.PAYMENT_PROVIDER ?? 'click',
  apiKey: process.env.PAYMENT_API_KEY ?? '',
  webhookSecret: process.env.PAYMENT_WEBHOOK_SECRET ?? '',
}));
