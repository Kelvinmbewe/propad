import { Injectable, BadRequestException } from '@nestjs/common';
import { PayoutMethod, PaymentProvider } from '@propad/config';
// import { PayoutMethod, PaymentProvider } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  PayoutGatewayHandler,
  PayoutExecutionResponse,
  PayoutExecutionResult
} from '../interfaces/payout-gateway';

@Injectable()
export class StripePayoutGateway implements PayoutGatewayHandler {
  readonly provider = PaymentProvider.STRIPE;
  readonly supportedMethods: PayoutMethod[] = [PayoutMethod.BANK];

  constructor(private readonly prisma: PrismaService) { }

  async executePayout(input: {
    payoutTransactionId: string;
    amountCents: number;
    currency: any;
    method: PayoutMethod;
    recipientDetails: Record<string, unknown>;
    reference: string;
  }): Promise<PayoutExecutionResponse> {
    // Check if user has connected Stripe account
    const connectedAccountId = input.recipientDetails.stripeAccountId as string;

    if (!connectedAccountId) {
      return {
        result: PayoutExecutionResult.NOT_CONFIGURED,
        failureReason: 'Stripe connected account not found. User must connect their Stripe account.'
      };
    }

    // Validate configuration
    const isValid = await this.validateConfiguration();
    if (!isValid) {
      return {
        result: PayoutExecutionResult.NOT_CONFIGURED,
        failureReason: 'Stripe provider is not properly configured'
      };
    }

    // Stub implementation - not yet implemented
    return {
      result: PayoutExecutionResult.NOT_CONFIGURED,
      failureReason: 'Stripe payout execution is not yet implemented'
    };
  }

  async validateConfiguration(): Promise<boolean> {
    try {
      const settings = await this.prisma.paymentProviderSettings.findUnique({
        where: { provider: PaymentProvider.STRIPE }
      });

      if (!settings || !settings.enabled) {
        return false;
      }

      if (!settings.apiKey || !settings.apiSecret) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  async validateRecipient(method: PayoutMethod, recipientDetails: Record<string, unknown>): Promise<boolean> {
    if (method !== PayoutMethod.BANK) {
      return false;
    }

    // Check for Stripe connected account ID
    const stripeAccountId = recipientDetails.stripeAccountId as string;
    if (!stripeAccountId || typeof stripeAccountId !== 'string') {
      return false;
    }

    // Stripe account IDs start with 'acct_'
    return stripeAccountId.startsWith('acct_');
  }
}

