import { Currency } from '@prisma/client';
import { PayoutMethod, PaymentProvider } from '@propad/config';
// import { Currency, PayoutMethod, PaymentProvider } from '@prisma/client';

export enum PayoutExecutionResult {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  NOT_CONFIGURED = 'NOT_CONFIGURED',
  INVALID_CONFIG = 'INVALID_CONFIG'
}

export interface PayoutExecutionResponse {
  result: PayoutExecutionResult;
  gatewayRef?: string;
  failureReason?: string;
  metadata?: Record<string, unknown>;
}

export interface PayoutGatewayHandler {
  readonly provider: PaymentProvider;
  readonly supportedMethods: PayoutMethod[];

  /**
   * Execute a payout transaction
   * Should only be called when PayoutTransaction.status === PROCESSING
   */
  executePayout(input: {
    payoutTransactionId: string;
    amountCents: number;
    currency: Currency;
    method: PayoutMethod;
    recipientDetails: Record<string, unknown>; // Account details from PayoutAccount
    reference: string;
  }): Promise<PayoutExecutionResponse>;

  /**
   * Validate that the provider is properly configured
   */
  validateConfiguration(): Promise<boolean>;

  /**
   * Validate that recipient details are valid for this provider
   */
  validateRecipient(method: PayoutMethod, recipientDetails: Record<string, unknown>): Promise<boolean>;
}

