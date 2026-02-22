import { HttpService } from '@nestjs/axios';
import { Injectable, BadRequestException } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { createHash } from 'crypto';
import { Currency } from '@prisma/client';
import { PayoutMethod, PaymentProvider } from '@propad/config';
// import { Currency, PayoutMethod, PaymentProvider } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  PayoutGatewayHandler,
  PayoutExecutionResponse,
  PayoutExecutionResult
} from '../interfaces/payout-gateway';

interface PaynowPayoutConfig {
  id: string;
  key: string;
  payoutEndpoint: string;
}

@Injectable()
export class PaynowPayoutGateway implements PayoutGatewayHandler {
  readonly provider = PaymentProvider.PAYNOW;
  readonly supportedMethods: PayoutMethod[] = [PayoutMethod.ECOCASH, PayoutMethod.BANK];

  private readonly payoutEndpoint = 'https://www.paynow.co.zw/interface/remittances';

  constructor(
    private readonly http: HttpService,
    private readonly prisma: PrismaService
  ) { }

  async executePayout(input: {
    payoutTransactionId: string;
    amountCents: number;
    currency: Currency;
    method: PayoutMethod;
    recipientDetails: Record<string, unknown>;
    reference: string;
  }): Promise<PayoutExecutionResponse> {
    const config = await this.requireConfig();

    if (!this.supportedMethods.includes(input.method)) {
      return {
        result: PayoutExecutionResult.FAILED,
        failureReason: `Paynow does not support payout method: ${input.method}`
      };
    }

    // Validate recipient details
    const validationResult = await this.validateRecipient(input.method, input.recipientDetails);
    if (!validationResult) {
      return {
        result: PayoutExecutionResult.INVALID_CONFIG,
        failureReason: 'Invalid recipient details for Paynow payout'
      };
    }

    try {
      const amount = (input.amountCents / 100).toFixed(2);

      // Build Paynow payout request
      const params = new URLSearchParams();
      params.append('id', config.id);
      params.append('reference', input.reference);
      params.append('amount', amount);
      params.append('currency', input.currency);

      if (input.method === PayoutMethod.ECOCASH) {
        const ecocashNumber = input.recipientDetails.ecocashNumber as string;
        if (!ecocashNumber) {
          return {
            result: PayoutExecutionResult.INVALID_CONFIG,
            failureReason: 'EcoCash number is required'
          };
        }
        params.append('method', 'ecocash');
        params.append('recipient', ecocashNumber);
      } else if (input.method === PayoutMethod.BANK) {
        const accountNumber = input.recipientDetails.accountNumber as string;
        const bankCode = input.recipientDetails.bankCode as string;
        if (!accountNumber || !bankCode) {
          return {
            result: PayoutExecutionResult.INVALID_CONFIG,
            failureReason: 'Bank account number and bank code are required'
          };
        }
        params.append('method', 'bank');
        params.append('accountnumber', accountNumber);
        params.append('bankcode', bankCode);
        if (input.recipientDetails.accountName) {
          params.append('accountname', input.recipientDetails.accountName as string);
        }
      }

      // Compute hash
      const hash = this.computeHash(params, config.key);
      params.append('hash', hash);

      // Execute payout
      const response = await firstValueFrom(
        this.http.post(this.payoutEndpoint, params.toString(), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: 30000 // 30 second timeout for payouts
        })
      );

      const data = this.parseKeyValue(response.data);

      // Verify response hash
      const providedHash = data.hash ?? data.HASH;
      if (providedHash) {
        const computed = this.computeHash(data, config.key);
        if (computed !== providedHash.toUpperCase()) {
          return {
            result: PayoutExecutionResult.FAILED,
            failureReason: 'Invalid Paynow response signature'
          };
        }
      }

      const status = (data.status ?? '').toLowerCase();
      if (status === 'ok' || status === 'success' || status === 'sent') {
        return {
          result: PayoutExecutionResult.SUCCESS,
          gatewayRef: data.reference ?? data.payoutreference ?? data.transactionreference ?? input.reference,
          metadata: {
            paynowReference: data.payoutreference ?? data.transactionreference,
            status: data.status,
            message: data.message
          }
        };
      } else {
        return {
          result: PayoutExecutionResult.FAILED,
          failureReason: data.message ?? data.error ?? 'Paynow payout failed',
          metadata: {
            status: data.status,
            response: data
          }
        };
      }
    } catch (error) {
      return {
        result: PayoutExecutionResult.FAILED,
        failureReason: error instanceof Error ? error.message : 'Paynow payout execution failed',
        metadata: {
          error: String(error)
        }
      };
    }
  }

  async validateConfiguration(): Promise<boolean> {
    try {
      const config = await this.requireConfig();
      return !!config.id && !!config.key;
    } catch {
      return false;
    }
  }

  async validateRecipient(method: PayoutMethod, recipientDetails: Record<string, unknown>): Promise<boolean> {
    if (method === PayoutMethod.ECOCASH) {
      const ecocashNumber = recipientDetails.ecocashNumber as string;
      if (!ecocashNumber) {
        return false;
      }
      // Validate EcoCash number format (Zimbabwe mobile: +263XXXXXXXXX or 0XXXXXXXXX)
      const normalized = ecocashNumber.replace(/\s+/g, '');
      return /^(\+263|0)[0-9]{9}$/.test(normalized);
    } else if (method === PayoutMethod.BANK) {
      const accountNumber = recipientDetails.accountNumber as string;
      const bankCode = recipientDetails.bankCode as string;
      return !!accountNumber && !!bankCode && accountNumber.length > 0 && bankCode.length > 0;
    }
    return false;
  }

  private async requireConfig(): Promise<PaynowPayoutConfig> {
    const settings = await this.prisma.paymentProviderSettings.findUnique({
      where: { provider: PaymentProvider.PAYNOW }
    });

    if (!settings || !settings.enabled) {
      throw new BadRequestException('Paynow provider is not enabled');
    }

    if (!settings.apiKey || !settings.apiSecret) {
      throw new BadRequestException('Paynow provider credentials are not configured');
    }

    return {
      id: settings.apiKey,
      key: settings.apiSecret,
      payoutEndpoint: this.payoutEndpoint
    };
  }

  private parseKeyValue(body: string): Record<string, string> {
    return body
      .split('&')
      .map((pair) => pair.split('='))
      .reduce<Record<string, string>>((acc, [key, value]) => {
        if (!key) {
          return acc;
        }
        acc[key.toLowerCase()] = decodeURIComponent(value ?? '');
        return acc;
      }, {});
  }

  private computeHash(params: URLSearchParams | Record<string, string>, key: string): string {
    let canonical: string;

    if (params instanceof URLSearchParams) {
      const entries = Array.from(params.entries())
        .filter(([k]) => k.toLowerCase() !== 'hash')
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}=${v}`);
      canonical = entries.join('&');
    } else {
      const entries = Object.entries(params)
        .filter(([k]) => k.toLowerCase() !== 'hash')
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}=${v}`);
      canonical = entries.join('&');
    }

    return createHash('sha512').update(`${canonical}${key}`).digest('hex').toUpperCase();
  }
}

