import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { createHash } from 'crypto';
import { Currency, PaymentGateway, PaymentIntentStatus } from '@prisma/client';
import { env } from '@propad/config';
import { PaymentGatewayHandler, PaymentIntentResult, PaymentWebhookResult } from '../interfaces/payment-gateway';

interface PaynowConfig {
  id: string;
  key: string;
  resultUrl: string;
  returnUrl: string;
}

@Injectable()
export class PaynowGateway implements PaymentGatewayHandler {
  readonly gateway = PaymentGateway.PAYNOW;

  private readonly endpoint = 'https://www.paynow.co.zw/interface/initiatepayment';

  constructor(private readonly http: HttpService) {}

  async createIntent(input: {
    invoiceId: string;
    amountCents: number;
    currency: Currency;
    reference: string;
    description: string;
    returnUrl: string;
  }): Promise<PaymentIntentResult> {
    const config = this.requireConfig();

    const amount = (input.amountCents / 100).toFixed(2);

    const params = new URLSearchParams({
      resulturl: config.resultUrl,
      returnurl: input.returnUrl || config.returnUrl,
      reference: input.reference,
      amount,
      id: config.id,
      additionalinfo: input.description
    });

    const response = await firstValueFrom(
      this.http.post(this.endpoint, params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      })
    );

    const data = this.parseKeyValue(response.data);
    if (!data.status || data.status.toLowerCase() !== 'ok') {
      throw new Error(`Paynow initiation failed: ${response.data}`);
    }

    const redirectUrl = data.browserurl ?? data.redirecturl;
    if (!redirectUrl) {
      throw new Error('Paynow did not return a redirect URL');
    }

    return {
      redirectUrl,
      gatewayReference: data.pollurl ?? data.paynowreference ?? undefined,
      status: PaymentIntentStatus.REQUIRES_ACTION
    };
  }

  async verifyWebhook(payload: Record<string, string>): Promise<PaymentWebhookResult> {
    const config = this.requireConfig();

    const providedHash = payload.hash ?? payload.HASH;
    if (!providedHash) {
      throw new Error('Missing Paynow hash');
    }

    const computed = this.computeHash(payload, config.key);
    if (computed !== providedHash.toUpperCase()) {
      throw new Error('Invalid Paynow signature');
    }

    const amount = this.toNumber(payload.paidamount ?? payload.amount ?? '0');
    const amountCents = Math.round(amount * 100);
    const status = (payload.status ?? '').toLowerCase();
    const success = status === 'paid' || status === 'awaiting delivery';

    return {
      reference: payload.reference || payload.pollreference || payload.paynowreference || '',
      externalRef: payload.paynowreference ?? payload.transactionreference ?? '',
      amountCents,
      currency: this.detectCurrency(payload.currency),
      success,
      rawPayload: payload
    };
  }

  async pollStatus(pollUrl: string): Promise<PaymentWebhookResult> {
    const config = this.requireConfig();

    try {
      const response = await firstValueFrom(
        this.http.get(pollUrl, {
          timeout: 10000, // 10 second timeout
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        })
      );

      const data = this.parseKeyValue(response.data);
      
      // Verify hash if present
      const providedHash = data.hash ?? data.HASH;
      if (providedHash) {
        const computed = this.computeHash(data, config.key);
        if (computed !== providedHash.toUpperCase()) {
          throw new Error('Invalid Paynow signature in poll response');
        }
      }

      const amount = this.toNumber(data.amount ?? data.paidamount ?? '0');
      const amountCents = Math.round(amount * 100);
      const status = (data.status ?? '').toLowerCase();
      const success = status === 'paid' || status === 'awaiting delivery';

      return {
        reference: data.reference || data.pollreference || data.paynowreference || '',
        externalRef: data.paynowreference ?? data.transactionreference ?? '',
        amountCents,
        currency: this.detectCurrency(data.currency),
        success,
        rawPayload: data
      };
    } catch (error) {
      // If polling fails, return a failed result
      return {
        reference: '',
        externalRef: '',
        amountCents: 0,
        currency: Currency.USD,
        success: false,
        rawPayload: { error: error instanceof Error ? error.message : String(error) }
      };
    }
  }

  private requireConfig(): PaynowConfig {
    const id = env.PAYNOW_INTEGRATION_ID;
    const key = env.PAYNOW_INTEGRATION_KEY;
    const resultUrl = env.PAYNOW_RESULT_URL;
    const returnUrl = env.PAYNOW_RETURN_URL;

    if (!id || !key || !resultUrl || !returnUrl) {
      throw new Error('Paynow configuration is incomplete');
    }

    return { id, key, resultUrl, returnUrl };
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

  private computeHash(payload: Record<string, string>, key: string) {
    const canonical = Object.entries(payload)
      .filter(([k]) => k.toLowerCase() !== 'hash')
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('&');

    return createHash('sha512').update(`${canonical}${key}`).digest('hex').toUpperCase();
  }

  private toNumber(value: string) {
    const parsed = parseFloat(value ?? '0');
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  private detectCurrency(value?: string): Currency {
    if (!value) {
      return Currency.USD;
    }

    const normalized = value.toUpperCase();
    if (normalized.startsWith('ZW')) {
      return Currency.ZWG;
    }

    return Currency.USD;
  }
}
