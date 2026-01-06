import { IsEnum } from 'class-validator';
import { PaymentProvider } from '@prisma/client';

export class PaymentWebhookDto {
  @IsEnum(PaymentProvider)
  provider!: PaymentProvider;
}
