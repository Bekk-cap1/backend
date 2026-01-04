import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaymentsRepository } from './payments.repository';
import { PaymentProviderRegistry } from './providers/payment-provider.registry';
import { ClickProvider } from './providers/click.provider';
import { PaymeProvider } from './providers/payme.provider';
import { StripeProvider } from './providers/stripe.provider';
import { PaymentsWebhookController } from './webhooks/payments.webhook.controller';

@Module({
  controllers: [PaymentsController, PaymentsWebhookController],
  providers: [
    PaymentsService,
    PaymentsRepository,
    PaymentProviderRegistry,

    ClickProvider,
    PaymeProvider,
    StripeProvider,

    // registry bootstrap
    {
      provide: 'PAYMENT_PROVIDERS_BOOTSTRAP',
      inject: [PaymentProviderRegistry, ClickProvider, PaymeProvider, StripeProvider],
      useFactory: (reg: PaymentProviderRegistry, click: ClickProvider, payme: PaymeProvider, stripe: StripeProvider) => {
        reg.register(click);
        reg.register(payme);
        reg.register(stripe);
        return true;
      },
    },
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
    