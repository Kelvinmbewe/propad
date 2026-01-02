import { Injectable, BadRequestException } from '@nestjs/common';
import { PayoutMethod, PaymentProvider } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  PayoutGatewayHandler,
  PayoutExecutionResponse,
  PayoutExecutionResult
} from '../interfaces/payout-gateway';

@Injectable()
export class PayPalPayoutGateway implements PayoutGatewayHandler {
  readonly provider = PaymentProvider.PAYPAL;
  readonly supportedMethods: PayoutMethod[] = [PayoutMethod.BANK];

  constructor(private readonly prisma: PrismaService) {}

  async executePayout(input: {
    payoutTransactionId: string;
    amountCents: number;
    currency: any;
    method: PayoutMethod;
    recipientDetails: Record<string, unknown>;
    reference: string;
  }): Promise<PayoutExecutionResponse> {
    // Check if user has PayPal email in payment profile
    const paypalEmail = input.recipientDetails.paypalEmail as string;
    
    if (!paypalEmail) {
      return {
        result: PayoutExecutionResult.NOT_CONFIGURED,
        failureReason: 'PayPal email not found in user payment profile'
      };
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(paypalEmail)) {
      return {
        result: PayoutExecutionResult.INVALID_CONFIG,
        failureReason: 'Invalid PayPal email format'
      };
    }

    // Validate configuration
    const isValid = await this.validateConfiguration();
    if (!isValid) {
      return {
        result: PayoutExecutionResult.NOT_CONFIGURED,
        failureReason: 'PayPal provider is not properly configured'
      };
    }

    // Stub implementation - not yet implemented
    return {
      result: PayoutExecutionResult.NOT_CONFIGURED,
      failureReason: 'PayPal payout execution is not yet implemented'
    };
  }

  async validateConfiguration(): Promise<boolean> {
    try {
      const settings = await this.prisma.paymentProviderSettings.findUnique({
        where: { provider: PaymentProvider.PAYPAL }
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

    const paypalEmail = recipientDetails.paypalEmail as string;
    if (!paypalEmail || typeof paypalEmail !== 'string') {
      return false;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(paypalEmail);
  }
}

