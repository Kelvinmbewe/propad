import { Currency, PaymentGateway, PaymentIntentStatus } from '@prisma/client';

export interface PaymentIntentResult {
  redirectUrl: string;
  gatewayReference?: string;
  status?: PaymentIntentStatus;
}

export interface PaymentWebhookResult {
  reference: string;
  externalRef: string;
  amountCents: number;
  currency: Currency;
  success: boolean;
  feeCents?: number;
  rawPayload?: Record<string, unknown>;
}

export interface PaymentGatewayHandler {
  readonly gateway: PaymentGateway;

  createIntent(input: {
    invoiceId: string;
    amountCents: number;
    currency: Currency;
    reference: string;
    description: string;
    returnUrl: string;
  }): Promise<PaymentIntentResult>;

  verifyWebhook(payload: Record<string, string>): Promise<PaymentWebhookResult>;

  pollStatus?(pollUrl: string): Promise<PaymentWebhookResult>;
}
