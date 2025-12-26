import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  ChargeableItemType,
  Currency,
  OwnerType,
  PayoutMethod,
  PayoutStatus,
  Prisma,
  WalletTransactionSource
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PricingService } from './pricing.service';

@Injectable()
export class PayoutsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly pricing: PricingService
  ) {}

  async createPayoutRequest(
    ownerType: OwnerType,
    ownerId: string,
    amountCents: number,
    method: PayoutMethod,
    payoutAccountId: string,
    currency: Currency = Currency.USD
  ) {
    // Get or create wallet
    const wallet = await this.prisma.wallet.upsert({
      where: {
        ownerType_ownerId_currency: {
          ownerType,
          ownerId,
          currency
        }
      },
      create: {
        ownerType,
        ownerId,
        currency,
        balanceCents: 0,
        pendingCents: 0
      },
      update: {}
    });

    // Check minimum payout amount (configurable per role)
    const minPayout = await this.getMinimumPayout(ownerType);
    if (amountCents < minPayout) {
      throw new BadRequestException(
        `Minimum payout amount is ${(minPayout / 100).toFixed(2)} ${currency}`
      );
    }

    // Check available balance
    if (wallet.balanceCents < amountCents) {
      throw new BadRequestException('Insufficient balance for payout');
    }

    // Verify payout account
    const payoutAccount = await this.prisma.payoutAccount.findUnique({
      where: { id: payoutAccountId }
    });
    if (!payoutAccount || payoutAccount.ownerId !== ownerId || payoutAccount.ownerType !== ownerType) {
      throw new NotFoundException('Payout account not found');
    }

    // Create payout request
    const payoutRequest = await this.prisma.$transaction(async (tx) => {
      // Lock wallet and deduct balance
      const lockedWallet = await tx.wallet.findUnique({
        where: { id: wallet.id }
      });
      if (!lockedWallet || lockedWallet.balanceCents < amountCents) {
        throw new BadRequestException('Insufficient balance');
      }

      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balanceCents: { decrement: amountCents },
          pendingCents: { increment: amountCents }
        }
      });

      return tx.payoutRequest.create({
        data: {
          walletId: wallet.id,
          amountCents,
          method,
          payoutAccountId,
          status: PayoutStatus.REQUESTED
        },
        include: {
          wallet: true,
          payoutAccount: true
        }
      });
    });

    await this.audit.log({
      action: 'payout.requested',
      actorId: ownerId,
      targetType: 'payoutRequest',
      targetId: payoutRequest.id,
      metadata: { amountCents, method }
    });

    return payoutRequest;
  }

  async approvePayout(payoutRequestId: string, actorId: string) {
    const payoutRequest = await this.prisma.payoutRequest.findUnique({
      where: { id: payoutRequestId },
      include: { wallet: true, payoutAccount: true }
    });

    if (!payoutRequest) {
      throw new NotFoundException('Payout request not found');
    }

    if (payoutRequest.status !== PayoutStatus.REQUESTED && payoutRequest.status !== PayoutStatus.REVIEW) {
      throw new BadRequestException('Payout request cannot be approved in current status');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const payout = await tx.payoutRequest.update({
        where: { id: payoutRequestId },
        data: { status: PayoutStatus.APPROVED }
      });

      // Create payout transaction
      await tx.payoutTransaction.create({
        data: {
          payoutRequestId: payout.id,
          amountCents: payout.amountCents,
          currency: payout.wallet.currency,
          method: payout.method,
          status: PayoutStatus.APPROVED
        }
      });

      return payout;
    });

    await this.audit.log({
      action: 'payout.approved',
      actorId,
      targetType: 'payoutRequest',
      targetId: payoutRequestId
    });

    return updated;
  }

  async rejectPayout(payoutRequestId: string, reason: string, actorId: string) {
    const payoutRequest = await this.prisma.payoutRequest.findUnique({
      where: { id: payoutRequestId },
      include: { wallet: true }
    });

    if (!payoutRequest) {
      throw new NotFoundException('Payout request not found');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // Refund to wallet
      await tx.wallet.update({
        where: { id: payoutRequest.walletId },
        data: {
          balanceCents: { increment: payoutRequest.amountCents },
          pendingCents: { decrement: payoutRequest.amountCents }
        }
      });

      return tx.payoutRequest.update({
        where: { id: payoutRequestId },
        data: {
          status: PayoutStatus.CANCELLED
        }
      });
    });

    await this.audit.log({
      action: 'payout.rejected',
      actorId,
      targetType: 'payoutRequest',
      targetId: payoutRequestId,
      metadata: { reason }
    });

    return updated;
  }

  async processPayout(payoutRequestId: string, gatewayRef: string, actorId: string) {
    const payoutRequest = await this.prisma.payoutRequest.findUnique({
      where: { id: payoutRequestId },
      include: { wallet: true, payoutAccount: true }
    });

    if (!payoutRequest) {
      throw new NotFoundException('Payout request not found');
    }

    if (payoutRequest.status !== PayoutStatus.APPROVED) {
      throw new BadRequestException('Payout must be approved before processing');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // Update wallet pending
      await tx.wallet.update({
        where: { id: payoutRequest.walletId },
        data: {
          pendingCents: { decrement: payoutRequest.amountCents }
        }
      });

      // Update payout request
      const payout = await tx.payoutRequest.update({
        where: { id: payoutRequestId },
        data: {
          status: PayoutStatus.SENT,
          txRef: gatewayRef
        }
      });

      // Update payout transaction
      await tx.payoutTransaction.updateMany({
        where: { payoutRequestId },
        data: {
          status: PayoutStatus.SENT,
          gatewayRef,
          processedAt: new Date(),
          processedBy: actorId
        }
      });

      return payout;
    });

    await this.audit.log({
      action: 'payout.processed',
      actorId,
      targetType: 'payoutRequest',
      targetId: payoutRequestId,
      metadata: { gatewayRef }
    });

    return updated;
  }

  async getUserPayoutRequests(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        paymentProfile: true
      }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get user's wallets
    const wallets = await this.prisma.wallet.findMany({
      where: {
        ownerType: OwnerType.USER,
        ownerId: userId
      }
    });

    const walletIds = wallets.map((w) => w.id);

    return this.prisma.payoutRequest.findMany({
      where: {
        walletId: { in: walletIds }
      },
      include: {
        wallet: true,
        payoutAccount: true,
        payoutTransactions: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getPendingPayouts() {
    return this.prisma.payoutRequest.findMany({
      where: {
        status: {
          in: [PayoutStatus.REQUESTED, PayoutStatus.REVIEW, PayoutStatus.APPROVED]
        }
      },
      include: {
        wallet: true,
        payoutAccount: true,
        payoutTransactions: true
      },
      orderBy: { createdAt: 'asc' }
    });
  }

  private async getMinimumPayout(ownerType: OwnerType): Promise<number> {
    // In production, this would be configurable per role
    const config = await this.prisma.appConfig.findUnique({
      where: { key: `minPayout_${ownerType}` }
    });

    if (config) {
      const value = config.jsonValue as { amountCents?: number };
      return value.amountCents ?? 1000; // Default $10.00
    }

    return 1000; // Default minimum $10.00
  }

  async calculateRevenueSplit(
    amountCents: number,
    itemType: string
  ): Promise<{
    platformCents: number;
    agentCents?: number;
    referralCents?: number;
    rewardPoolCents?: number;
  }> {
    try {
      const pricing = await this.pricing.calculatePrice(itemType as ChargeableItemType);
      return {
        platformCents: pricing.commissionCents + pricing.platformFeeCents,
        agentCents: pricing.agentShareCents,
        referralCents: pricing.referralShareCents,
        rewardPoolCents: pricing.rewardPoolShareCents
      };
    } catch {
      // Default split if no pricing rule
      return {
        platformCents: Math.round(amountCents * 0.1), // 10% platform
        agentCents: Math.round(amountCents * 0.7), // 70% agent
        referralCents: Math.round(amountCents * 0.1), // 10% referral
        rewardPoolCents: Math.round(amountCents * 0.1) // 10% reward pool
      };
    }
  }
}

