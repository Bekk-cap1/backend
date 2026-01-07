import { Injectable } from '@nestjs/common';
import { PaymentProvider } from '@prisma/client';
import { PaymentProviderAdapter } from './payment-provider.interface';

@Injectable()
export class PaymentProviderRegistry {
  private readonly map = new Map<PaymentProvider, PaymentProviderAdapter>();

  register(adapter: PaymentProviderAdapter) {
    this.map.set(adapter.provider, adapter);
  }

  get(provider: PaymentProvider): PaymentProviderAdapter {
    const found = this.map.get(provider);
    if (!found)
      throw new Error(`Payment provider adapter not registered: ${provider}`);
    return found;
  }

  list(): PaymentProvider[] {
    return Array.from(this.map.keys());
  }
}
