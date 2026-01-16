import { Inject, Injectable } from "@nestjs/common";
import { PaymentGateway } from "@prisma/client";
import { PaymentGatewayHandler } from "./interfaces/payment-gateway";
import { PAYMENT_GATEWAYS } from "./payments.constants";

@Injectable()
export class PaymentGatewayRegistry {
  private readonly registry = new Map<PaymentGateway, PaymentGatewayHandler>();

  constructor(@Inject(PAYMENT_GATEWAYS) gateways: PaymentGatewayHandler[]) {
    for (const gateway of gateways) {
      this.registry.set(gateway.gateway, gateway);
    }
  }

  get(gateway: PaymentGateway) {
    const handler = this.registry.get(gateway);
    if (!handler) {
      throw new Error(`Unsupported payment gateway: ${gateway}`);
    }
    return handler;
  }

  list() {
    return Array.from(this.registry.values());
  }
}
