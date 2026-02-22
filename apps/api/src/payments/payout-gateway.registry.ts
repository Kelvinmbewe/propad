import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { PaymentProvider } from '@propad/config';
// import { PaymentProvider } from '@prisma/client';
import { PayoutGatewayHandler } from './interfaces/payout-gateway';
import { PAYOUT_GATEWAYS } from './payments.constants';

@Injectable()
export class PayoutGatewayRegistry {
  private readonly registry = new Map<PaymentProvider, PayoutGatewayHandler>();

  constructor(@Inject(PAYOUT_GATEWAYS) gateways: PayoutGatewayHandler[]) {
    for (const gateway of gateways) {
      this.registry.set(gateway.provider, gateway);
    }
  }

  get(provider: PaymentProvider): PayoutGatewayHandler {
    const handler = this.registry.get(provider);
    if (!handler) {
      throw new BadRequestException(`Unsupported payout provider: ${provider}`);
    }
    return handler;
  }

  has(provider: PaymentProvider): boolean {
    return this.registry.has(provider);
  }
}

