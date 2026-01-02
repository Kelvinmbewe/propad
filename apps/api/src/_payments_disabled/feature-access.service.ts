import { Injectable } from '@nestjs/common';
import { ChargeableItemType, PaymentStatus, Invoice, InvoiceLine } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PricingService } from './pricing.service';

export enum FeatureAccessStatus {
  FREE = 'FREE', // Feature is free (no pricing rule or rule has 0 price)
  REQUIRED = 'REQUIRED', // Payment required but not yet paid
  GRANTED = 'GRANTED', // Payment completed, access granted
  EXPIRED = 'EXPIRED' // Payment exists but may have expired (future use)
}

export interface FeatureAccessResult {
  status: FeatureAccessStatus;
  pricingBreakdown?: {
    priceCents: number;
    currency: string;
    totalCents: number;
  };
  paymentTransactionId?: string;
  requiresPayment: boolean;
}

@Injectable()
export class FeatureAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: PricingService
  ) { }

  /**
   * Check access status for a feature
   */
  async checkAccess(
    userId: string,
    featureType: ChargeableItemType,
    targetId: string
  ): Promise<FeatureAccessResult> {
    // Check if pricing rule exists and is active
    let pricingRule;
    try {
      pricingRule = await this.pricing.getPricingRule(featureType);
    } catch {
      // No pricing rule or inactive - feature is FREE
      return {
        status: FeatureAccessStatus.FREE,
        requiresPayment: false
      };
    }

    // If price is 0, feature is FREE
    if (pricingRule.priceUsdCents === 0) {
      return {
        status: FeatureAccessStatus.FREE,
        requiresPayment: false
      };
    }

    // Feature requires payment - check if payment exists
    // Check invoices with lines containing feature metadata
    const invoices = await this.prisma.invoice.findMany({
      where: {
        buyerUserId: userId,
        lines: {
          some: {
            metaJson: {
              path: ['featureType'],
              equals: featureType
            }
          }
        }
      },
      include: {
        lines: {
          where: {
            metaJson: {
              path: ['featureId'],
              equals: targetId
            }
          }
        },
        paymentTransactions: {
          where: {
            status: PaymentStatus.PAID
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 1
        }
      }
    });

    // Find invoice with matching featureId in line metadata
    const matchingInvoice = invoices.find((inv: Invoice & { lines: InvoiceLine[] }) =>
      inv.lines.some(
        (line: InvoiceLine) =>
          (line.metaJson as { featureType?: string; featureId?: string })?.featureType === featureType &&
          (line.metaJson as { featureType?: string; featureId?: string })?.featureId === targetId
      )
    );

    const paymentTransaction = matchingInvoice?.paymentTransactions?.[0];

    if (paymentTransaction) {
      return {
        status: FeatureAccessStatus.GRANTED,
        requiresPayment: true,
        paymentTransactionId: paymentTransaction.id,
        pricingBreakdown: {
          priceCents: pricingRule.priceUsdCents,
          currency: pricingRule.currency,
          totalCents: pricingRule.priceUsdCents
        }
      };
    }

    // Payment required but not paid
    const breakdown = await this.pricing.calculatePrice(featureType);
    return {
      status: FeatureAccessStatus.REQUIRED,
      requiresPayment: true,
      pricingBreakdown: {
        priceCents: breakdown.priceCents,
        currency: breakdown.currency,
        totalCents: breakdown.totalCents
      }
    };
  }

  /**
   * Get pricing breakdown for a feature (for display before payment)
   */
  async getPricingBreakdown(featureType: ChargeableItemType) {
    try {
      const breakdown = await this.pricing.calculatePrice(featureType);
      return {
        featureType,
        ...breakdown,
        isFree: breakdown.priceCents === 0
      };
    } catch {
      // No pricing rule - feature is free
      return {
        featureType,
        isFree: true,
        priceCents: 0,
        totalCents: 0,
        currency: 'USD' as const
      };
    }
  }

  /**
   * Check if user has paid for a specific feature
   */
  async hasPaid(userId: string, featureType: ChargeableItemType, targetId: string): Promise<boolean> {
    const result = await this.checkAccess(userId, featureType, targetId);
    return result.status === FeatureAccessStatus.GRANTED;
  }
}

