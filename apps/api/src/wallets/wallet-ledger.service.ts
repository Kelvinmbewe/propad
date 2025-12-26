import { Injectable, BadRequestException } from '@nestjs/common';
import {
  Currency,
  OwnerType,
  WalletLedgerType,
  WalletLedgerSourceType,
  Prisma
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WalletLedgerService {
  constructor(private readonly prisma: PrismaService) { }

  /**
   * Create a CREDIT ledger entry (earnings)
   */
  async credit(
    userId: string,
    amountCents: number,
    currency: Currency,
    sourceType: WalletLedgerSourceType,
    sourceId?: string
  ) {
    if (amountCents <= 0) {
      throw new BadRequestException('Credit amount must be positive');
    }

    return this.prisma.walletLedger.create({
      data: {
        userId,
        type: WalletLedgerType.CREDIT,
        sourceType,
        sourceId: sourceId ?? null,
        amountCents,
        currency
      }
    });
  }

  /**
   * Create a DEBIT ledger entry (payouts)
   */
  async debit(
    userId: string,
    amountCents: number,
    currency: Currency,
    sourceType: WalletLedgerSourceType,
    sourceId?: string
  ) {
    if (amountCents <= 0) {
      throw new BadRequestException('Debit amount must be positive');
    }

    return this.prisma.walletLedger.create({
      data: {
        userId,
        type: WalletLedgerType.DEBIT,
        sourceType,
        sourceId: sourceId ?? null,
        amountCents,
        currency
      }
    });
  }

  /**
   * Calculate balance from ledger entries
   * Balance = SUM(CREDIT) - SUM(DEBIT)
   */
  async calculateBalance(userId: string, currency: Currency): Promise<{
    balanceCents: number;
    pendingCents: number;
    withdrawableCents: number;
  }> {
    const credits = await this.prisma.walletLedger.aggregate({
      where: {
        userId,
        currency,
        type: WalletLedgerType.CREDIT
      },
      _sum: {
        amountCents: true
      }
    });

    const debits = await this.prisma.walletLedger.aggregate({
      where: {
        userId,
        currency,
        type: WalletLedgerType.DEBIT
      },
      _sum: {
        amountCents: true
      }
    });

    const totalCredits = credits._sum.amountCents ?? 0;
    const totalDebits = debits._sum.amountCents ?? 0;
    const balanceCents = totalCredits - totalDebits;

    // Calculate pending: DEBIT entries with sourceType PAYOUT that are in PROCESSING or APPROVED state
    const pendingPayouts = await this.prisma.payoutRequest.findMany({
      where: {
        wallet: {
          ownerType: OwnerType.USER,
          ownerId: userId,
          currency
        },
        status: {
          in: ['PROCESSING', 'APPROVED', 'SENT']
        }
      },
      select: {
        amountCents: true
      }
    });

    const pendingCents = pendingPayouts.reduce((sum: number, p: { amountCents: number }) => sum + p.amountCents, 0);
    const withdrawableCents = Math.max(balanceCents - pendingCents, 0);

    return {
      balanceCents,
      pendingCents,
      withdrawableCents
    };
  }

  /**
   * Get ledger entries for a user
   */
  async getLedgerEntries(
    userId: string,
    currency?: Currency,
    limit: number = 100
  ) {
    return this.prisma.walletLedger.findMany({
      where: {
        userId,
        ...(currency && { currency })
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    });
  }

  /**
   * Verify sufficient balance before debit
   */
  async verifyBalance(
    userId: string,
    currency: Currency,
    amountCents: number
  ): Promise<boolean> {
    const balance = await this.calculateBalance(userId, currency);
    return balance.withdrawableCents >= amountCents;
  }
}

