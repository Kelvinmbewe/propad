import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Currency, OwnerType, Prisma, ReferralEarning } from '@prisma/client';
import { WalletLedgerSourceType } from '../wallet/enums';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PricingService } from './pricing.service';
import { WalletLedgerService } from '../wallets/wallet-ledger.service';

@Injectable()
export class ReferralsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly pricing: PricingService,
    private readonly ledger: WalletLedgerService
  ) { }

  async createReferralEarning(
    referrerId: string,
    sourceType: string,
    sourceId: string,
    amountCents: number,
    currency: Currency = Currency.USD,
    referredUserId?: string
  ) {
    // Check if referral earning already exists for this source
    const existing = await this.prisma.referralEarning.findFirst({
      where: {
        referrerId,
        sourceType,
        sourceId
      }
    });

    if (existing) {
      throw new BadRequestException('Referral earning already exists for this source');
    }

    // Get or create referrer's wallet
    const wallet = await this.prisma.wallet.upsert({
      where: {
        ownerType_ownerId_currency: {
          ownerType: OwnerType.USER,
          ownerId: referrerId,
          currency
        }
      },
      create: {
        ownerType: OwnerType.USER,
        ownerId: referrerId,
        currency,
        balanceCents: 0,
        pendingCents: 0
      },
      update: {}
    });

    // Create referral earning
    const earning = await this.prisma.referralEarning.create({
      data: {
        referrerId,
        referredUserId,
        sourceType,
        sourceId,
        amountCents,
        currency,
        status: 'PENDING'
      }
    });

    // Credit wallet via ledger
    await this.ledger.credit(
      referrerId,
      amountCents,
      currency,
      WalletLedgerSourceType.REFERRAL,
      earning.id
    );

    await this.audit.log({
      action: 'referralEarning.created',
      actorId: referrerId,
      targetType: 'referralEarning',
      targetId: earning.id,
      metadata: { amountCents, sourceType, sourceId }
    });

    return earning;
  }

  async getUserReferralEarnings(userId: string) {
    return this.prisma.referralEarning.findMany({
      where: { referrerId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        payoutRequest: true
      }
    });
  }

  async getReferralEarningsSummary(userId: string) {
    const earnings = await this.prisma.referralEarning.findMany({
      where: { referrerId: userId }
    });

    const totalEarned = earnings.reduce((sum: number, e: ReferralEarning) => sum + e.amountCents, 0);
    const pending = earnings
      .filter((e: ReferralEarning) => e.status === 'PENDING')
      .reduce((sum: number, e: ReferralEarning) => sum + e.amountCents, 0);
    const paid = earnings
      .filter((e: ReferralEarning) => e.status === 'PAID')
      .reduce((sum: number, e: ReferralEarning) => sum + e.amountCents, 0);

    return {
      totalEarned,
      pending,
      paid,
      count: earnings.length
    };
  }

  async processReferralFromPayment(
    paymentTransactionId: string,
    referrerId: string | null
  ) {
    if (!referrerId) {
      return null;
    }

    const payment = await this.prisma.paymentTransaction.findUnique({
      where: { id: paymentTransactionId },
      include: { invoice: true }
    });

    if (!payment) {
      throw new NotFoundException('Payment transaction not found');
    }

    // Get pricing rule to determine referral share
    try {
      const pricing = await this.pricing.calculatePrice(payment.featureType);
      if (!pricing.referralShareCents || pricing.referralShareCents === 0) {
        return null; // No referral share configured
      }

      return this.createReferralEarning(
        referrerId,
        'PAYMENT',
        paymentTransactionId,
        pricing.referralShareCents,
        payment.currency,
        payment.userId
      );
    } catch {
      // If no pricing rule, use default 10%
      const referralShare = Math.round(payment.amountCents * 0.1);
      return this.createReferralEarning(
        referrerId,
        'PAYMENT',
        paymentTransactionId,
        referralShare,
        payment.currency,
        payment.userId
      );
    }
  }

  async getReferralConfig() {
    const config = await this.prisma.appConfig.findUnique({
      where: { key: 'referral_config' }
    });

    if (!config) {
      return {
        enabled: true,
        percentage: 10,
        minPayout: 1000, // $10.00
        eligibilityRules: []
      };
    }

    return config.jsonValue as Prisma.JsonObject as {
      enabled: boolean;
      percentage: number;
      minPayout: number;
      eligibilityRules: string[];
    };
  }

  async updateReferralConfig(
    config: {
      enabled?: boolean;
      percentage?: number;
      minPayout?: number;
      eligibilityRules?: string[];
    },
    actorId: string
  ) {
    const existing = await this.getReferralConfig();
    const updated = {
      ...existing,
      ...config
    };

    await this.prisma.appConfig.upsert({
      where: { key: 'referral_config' },
      create: {
        key: 'referral_config',
        jsonValue: updated
      },
      update: {
        jsonValue: updated
      }
    });

    await this.audit.log({
      action: 'referralConfig.updated',
      actorId,
      targetType: 'config',
      targetId: 'referral_config',
      metadata: updated
    });

    return updated;
  }
}

