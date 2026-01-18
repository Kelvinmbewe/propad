import { Injectable, Logger } from '@nestjs/common';
import { PaymentGateway, PaymentIntentStatus, InvoiceLine } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentGatewayRegistry } from './payment-gateway.registry';

@Injectable()
export class PaymentPollingService {
  private readonly logger = new Logger(PaymentPollingService.name);
  private readonly MAX_POLL_ATTEMPTS = 30; // 5 minutes at 10s intervals
  private readonly POLL_INTERVAL_MS = 10000; // 10 seconds

  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: PaymentGatewayRegistry
  ) { }

  async pollPaymentIntent(intentId: string): Promise<boolean> {
    const intent = await this.prisma.paymentIntent.findUnique({
      where: { id: intentId },
      include: {
        invoice: {
          include: {
            buyerUser: true
          }
        }
      }
    });

    if (!intent) {
      this.logger.warn(`Payment intent ${intentId} not found for polling`);
      return false;
    }

    // Only poll Paynow payments
    if (intent.gateway !== PaymentGateway.PAYNOW) {
      return false;
    }

    // Don't poll if already succeeded or failed
    if (intent.status === PaymentIntentStatus.SUCCEEDED || intent.status === PaymentIntentStatus.FAILED) {
      return true;
    }

    // Get poll URL from gateway reference
    if (!intent.gatewayRef) {
      this.logger.warn(`Payment intent ${intentId} has no gateway reference for polling`);
      return false;
    }

    const handler = this.registry.get(intent.gateway);
    if (!handler.pollStatus) {
      this.logger.warn(`Gateway ${intent.gateway} does not support polling`);
      return false;
    }

    try {
      const result = await handler.pollStatus(intent.gatewayRef);

      if (result.success) {
        await this.handlePaymentSuccess(intentId, result);
        return true;
      } else {
        // Check if we should continue polling (might be pending)
        const status = (result.rawPayload?.status as string)?.toLowerCase();
        if (status === 'pending' || status === 'sent' || status === 'created') {
          // Still pending, will be polled again
          return false;
        } else {
          // Failed or cancelled
          await this.handlePaymentFailure(intentId, result);
          return true;
        }
      }
    } catch (error) {
      this.logger.error(`Error polling payment intent ${intentId}:`, error);
      return false;
    }
  }

  private async handlePaymentSuccess(intentId: string, result: any) {
    await this.prisma.$transaction(async (tx) => {
      const intent = await tx.paymentIntent.findUnique({
        where: { id: intentId },
        include: {
          invoice: {
            include: {
              lines: true,
              buyerUser: true,
              buyerAgency: true,
              promoBoost: true,
              campaign: { include: { flights: true } },
              fxRate: true
            }
          }
        }
      });

      if (!intent || intent.status === PaymentIntentStatus.SUCCEEDED) {
        return; // Already processed or not found
      }

      // Update intent
      await tx.paymentIntent.update({
        where: { id: intentId },
        data: {
          status: PaymentIntentStatus.SUCCEEDED,
          gatewayRef: intent.gatewayRef ?? result.externalRef ?? null
        }
      });

      // Create transaction record
      await tx.transaction.create({
        data: {
          invoiceId: intent.invoiceId,
          gateway: intent.gateway,
          externalRef: result.externalRef || result.reference,
          amountCents: result.amountCents,
          currency: result.currency,
          feeCents: result.feeCents ?? 0,
          netCents: result.amountCents - (result.feeCents ?? 0),
          result: 'SUCCESS',
          rawWebhookJson: result.rawPayload
        }
      });

      // Create PaymentTransaction if invoice has feature metadata
      const invoiceLine = intent.invoice.lines.find(
        (line: InvoiceLine) => line.metaJson && typeof line.metaJson === 'object' && 'featureType' in line.metaJson
      );

      if (invoiceLine && invoiceLine.metaJson && typeof invoiceLine.metaJson === 'object') {
        const meta = invoiceLine.metaJson as { featureType?: string; featureId?: string };
        if (meta.featureType && meta.featureId && intent.invoice.buyerUserId) {
          const transactionRef = result.externalRef || result.reference || `POLL-${intentId}`;
          await tx.paymentTransaction.upsert({
            where: { transactionRef },
            create: {
              userId: intent.invoice.buyerUserId,
              featureId: meta.featureId,
              featureType: meta.featureType as any,
              invoiceId: intent.invoiceId,
              paymentIntentId: intentId,
              amountCents: result.amountCents,
              currency: result.currency,
              status: 'PAID', // Use string literal instead of PaymentStatus enum
              gateway: intent.gateway,
              gatewayRef: result.externalRef,
              transactionRef,
              metadata: { polled: true, polledAt: new Date().toISOString() }
            },
            update: {
              status: 'PAID',
              gatewayRef: result.externalRef
            }
          });
        }
      }

      // Finalize invoice
      if (intent.invoice.status !== 'PAID') {
        // Use the payments service finalize logic (simplified here)
        await tx.invoice.update({
          where: { id: intent.invoiceId },
          data: {
            status: 'PAID',
            issuedAt: new Date(),
            invoiceNo: intent.invoice.invoiceNo ?? `PP-${new Date().getFullYear()}-${intent.invoice.id.slice(-6).toUpperCase()}`
          }
        });
      }
    });
  }

  private async handlePaymentFailure(intentId: string, result: any) {
    await this.prisma.$transaction(async (tx) => {
      const intent = await tx.paymentIntent.findUnique({
        where: { id: intentId }
      });

      if (!intent || intent.status === PaymentIntentStatus.FAILED) {
        return;
      }

      await tx.paymentIntent.update({
        where: { id: intentId },
        data: {
          status: PaymentIntentStatus.FAILED,
          gatewayRef: intent.gatewayRef ?? result.externalRef ?? null
        }
      });

      // Create failed transaction record
      await tx.transaction.create({
        data: {
          invoiceId: intent.invoiceId,
          gateway: intent.gateway,
          externalRef: result.externalRef || result.reference || `FAILED-${intentId}`,
          amountCents: result.amountCents || 0,
          currency: result.currency,
          feeCents: 0,
          netCents: 0,
          result: 'FAILED',
          rawWebhookJson: result.rawPayload
        }
      });
    });
  }

  async startPolling(intentId: string): Promise<void> {
    let attempts = 0;

    const poll = async () => {
      attempts++;
      const completed = await this.pollPaymentIntent(intentId);

      if (!completed && attempts < this.MAX_POLL_ATTEMPTS) {
        setTimeout(poll, this.POLL_INTERVAL_MS);
      } else if (attempts >= this.MAX_POLL_ATTEMPTS) {
        this.logger.warn(`Payment intent ${intentId} polling timed out after ${attempts} attempts`);
        await this.handlePaymentFailure(intentId, {
          externalRef: '',
          reference: '',
          amountCents: 0,
          currency: 'USD' as any,
          success: false,
          rawPayload: { timeout: true, attempts }
        });
      }
    };

    // Start polling after initial delay
    setTimeout(poll, this.POLL_INTERVAL_MS);
  }
}

