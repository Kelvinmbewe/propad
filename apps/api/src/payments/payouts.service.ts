import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  ChargeableItemType,
  Currency,
  OwnerType,
  PayoutMethod,
  PayoutStatus,
  Prisma,
  WalletTransactionSource,
  WalletLedgerSourceType
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PricingService } from './pricing.service';
import { WalletLedgerService } from '../wallets/wallet-ledger.service';

@Injectable()
export class PayoutsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly pricing: PricingService,
    private readonly ledger: WalletLedgerService
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

    // Verify payout account
    const payoutAccount = await this.prisma.payoutAccount.findUnique({
      where: { id: payoutAccountId }
    });
    if (!payoutAccount || payoutAccount.ownerId !== ownerId || payoutAccount.ownerType !== ownerType) {
      throw new NotFoundException('Payout account not found');
    }

    // Check available balance using ledger
    if (ownerType !== OwnerType.USER) {
      throw new BadRequestException('Only user wallets supported for ledger-based payouts');
    }

    const hasBalance = await this.ledger.verifyBalance(ownerId, currency, amountCents);
    if (!hasBalance) {
      throw new BadRequestException('Insufficient balance for payout');
    }

    // Create payout request (no ledger entry yet - will be created on approval)
    const payoutRequest = await this.prisma.payoutRequest.create({
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

    // Verify balance again before approval
    if (payoutRequest.wallet.ownerType !== OwnerType.USER) {
      throw new BadRequestException('Only user wallets supported');
    }

    const hasBalance = await this.ledger.verifyBalance(
      payoutRequest.wallet.ownerId,
      payoutRequest.wallet.currency,
      payoutRequest.amountCents
    );
    if (!hasBalance) {
      throw new BadRequestException('Insufficient balance for payout approval');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // Update status to APPROVED (will transition to PROCESSING when execution starts)
      const payout = await tx.payoutRequest.update({
        where: { id: payoutRequestId },
        data: { status: PayoutStatus.APPROVED }
      });

      // Create payout transaction record
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

    // If already processed (has DEBIT entry), we can't reject - must reverse
    if (payoutRequest.status === PayoutStatus.PROCESSING || payoutRequest.status === PayoutStatus.PAID) {
      throw new BadRequestException('Cannot reject payout that is already processing or paid');
    }

    // Simply cancel - no ledger entry needed since we never created a DEBIT
    const updated = await this.prisma.payoutRequest.update({
      where: { id: payoutRequestId },
      data: {
        status: PayoutStatus.CANCELLED
      }
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

    if (payoutRequest.wallet.ownerType !== OwnerType.USER) {
      throw new BadRequestException('Only user wallets supported');
    }

    // Verify balance one more time
    const hasBalance = await this.ledger.verifyBalance(
      payoutRequest.wallet.ownerId,
      payoutRequest.wallet.currency,
      payoutRequest.amountCents
    );
    if (!hasBalance) {
      throw new BadRequestException('Insufficient balance for payout processing');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // Update status to PROCESSING (locks the balance)
      const payout = await tx.payoutRequest.update({
        where: { id: payoutRequestId },
        data: {
          status: PayoutStatus.PROCESSING,
          txRef: gatewayRef
        }
      });

      // Create DEBIT ledger entry (locks balance during processing)
      await this.ledger.debit(
        payoutRequest.wallet.ownerId,
        payoutRequest.amountCents,
        payoutRequest.wallet.currency,
        WalletLedgerSourceType.PAYOUT,
        payoutRequestId
      );

      // Update payout transaction
      await tx.payoutTransaction.updateMany({
        where: { payoutRequestId },
        data: {
          status: PayoutStatus.PROCESSING,
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

