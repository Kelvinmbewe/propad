import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import {
  Currency,
  OwnerType,
  Prisma,
  WalletLedgerType,
  WalletLedgerSourceType
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WalletLedgerService {
  private readonly logger = new Logger(WalletLedgerService.name);

  constructor(private readonly prisma: PrismaService) { }

  /**
   * Create a CREDIT ledger entry (earnings, refunds)
   */
  async credit(
    userId: string,
    amountCents: number,
    currency: Currency,
    sourceType: WalletLedgerSourceType,
    sourceId?: string,
    description?: string,
    tx?: Prisma.TransactionClient
  ) {
    if (amountCents <= 0) {
      throw new BadRequestException('Credit amount must be positive');
    }

    const db = tx || this.prisma;

    return db.walletLedger.create({
      data: {
        userId,
        type: WalletLedgerType.CREDIT,
        sourceType,
        sourceId: sourceId ?? null,
        amountCents,
        currency,
        metadata: description ? { description } : undefined
      }
    });
  }

  /**
   * Create a DEBIT ledger entry (spending, payouts)
   */
  async debit(
    userId: string,
    amountCents: number,
    currency: Currency,
    sourceType: WalletLedgerSourceType,
    sourceId?: string,
    description?: string,
    tx?: Prisma.TransactionClient
  ) {
    if (amountCents <= 0) {
      throw new BadRequestException('Debit amount must be positive');
    }

    const db = tx || this.prisma;

    // Verify sufficient balance before debiting (considering holds)
    // Note: If inside a transaction, calculateBalance might not see uncommitted changes 
    // depending on isolation level, but we pass tx to it if we want it to.
    // For now, calculateBalance doesn't take tx.
    // TODO: Update calculateBalance to take tx if strict consistency within tx is needed.

    // For safety in high concurrency, we usually rely on DB constraints or atomic updates, 
    // but here we check logically.
    const { withdrawableCents } = await this.calculateBalance(userId, currency, tx);
    if (withdrawableCents < amountCents) {
      throw new BadRequestException('Insufficient funds');
    }

    return db.walletLedger.create({
      data: {
        userId,
        type: WalletLedgerType.DEBIT,
        sourceType,
        sourceId: sourceId ?? null,
        amountCents,
        currency,
        metadata: description ? { description } : undefined
      }
    });
  }

  /**
   * Create a HOLD ledger entry (e.g. payout request initiated)
   */
  async hold(
    userId: string,
    amountCents: number,
    currency: Currency,
    sourceType: WalletLedgerSourceType,
    sourceId: string,
    description?: string,
    tx?: Prisma.TransactionClient
  ) {
    if (amountCents <= 0) {
      throw new BadRequestException('Hold amount must be positive');
    }

    const db = tx || this.prisma;

    const { withdrawableCents } = await this.calculateBalance(userId, currency, tx);
    if (withdrawableCents < amountCents) {
      throw new BadRequestException('Insufficient funds to hold');
    }

    return db.walletLedger.create({
      data: {
        userId,
        type: WalletLedgerType.HOLD,
        sourceType,
        sourceId,
        amountCents,
        currency,
        metadata: description ? { description } : undefined
      }
    });
  }

  /**
   * RELEASE a hold (e.g. payout failed/cancelled)
   */
  async release(
    userId: string,
    amountCents: number,
    currency: Currency,
    sourceType: WalletLedgerSourceType,
    sourceId: string,
    description?: string,
    tx?: Prisma.TransactionClient
  ) {
    if (amountCents <= 0) {
      throw new BadRequestException('Release amount must be positive');
    }

    const db = tx || this.prisma;

    return db.walletLedger.create({
      data: {
        userId,
        type: WalletLedgerType.RELEASE,
        sourceType,
        sourceId,
        amountCents,
        currency,
        metadata: description ? { description } : undefined
      }
    });
  }

  /**
   * REFUND a debit (reversed transaction)
   */
  async refund(
    userId: string,
    amountCents: number,
    currency: Currency,
    sourceType: WalletLedgerSourceType,
    sourceId: string,
    description?: string,
    tx?: Prisma.TransactionClient
  ) {
    if (amountCents <= 0) {
      throw new BadRequestException('Refund amount must be positive');
    }

    const db = tx || this.prisma;

    return db.walletLedger.create({
      data: {
        userId,
        type: WalletLedgerType.REFUND,
        sourceType,
        sourceId,
        amountCents,
        currency,
        metadata: description ? { description } : undefined
      }
    });
  }

  /**
   * Calculate balance from ledger entries
   * Total Balance = (CREDIT + REFUND) - (DEBIT)
   * Available/Withdrawable = Total Balance - (HOLD - RELEASE)
   * 
   * Note: We assume DEBITs match successfully completed transactions or spent funds.
   * If a sequence is HOLD -> DEBIT, the DEBIT acts as the final removal.
   * We need to be careful not to double count if HOLD is not cleared?
   * 
   * Actually, usually:
   * 1. Payout Req: HOLD created. (Effective Balance goes down).
   * 2. Payout Success: DEBIT created (Real balance goes down), HOLD "cleared" (implicitly or explicit RELEASE?).
   * 
   * Strategy:
   * Total Equity = Sum(CREDIT) + Sum(REFUND) - Sum(DEBIT)
   * Locked Funds = Sum(HOLD) - Sum(RELEASE)
   * Withdrawable = Total Equity - Locked Funds
   * 
   * However, if a Payout Success happens, we generally create a DEBIT. Does that DEBIT replace the HOLD?
   * If we just add a DEBIT, Total Equity reduces. But Locked Funds is still high?
   * 
   * Standard Ledger Pattern:
   * - HOLD reserves funds.
   * - To Finalize: RELEASE (unlock) + DEBIT (spend).
   * - To Cancel: RELEASE (unlock).
   * 
   * So "Payout Success" should trigger: RELEASE(amount) AND DEBIT(amount).
   * "Payout Failure" should trigger: RELEASE(amount).
   */
  async calculateBalance(
    userId: string,
    currency: Currency,
    tx?: Prisma.TransactionClient
  ): Promise<{
    balanceCents: number;
    pendingCents: number;
    withdrawableCents: number;
  }> {
    const db = tx || this.prisma;
    const aggregates = await db.walletLedger.groupBy({
      by: ['type'],
      where: {
        userId,
        currency
      },
      _sum: {
        amountCents: true
      }
    });

    let credits = 0;
    let debits = 0;
    let refunds = 0;
    let holds = 0;
    let releases = 0;

    aggregates.forEach((agg: any) => {
      const amount = agg._sum.amountCents || 0;
      switch (agg.type) {
        case WalletLedgerType.CREDIT: credits = amount; break;
        case WalletLedgerType.DEBIT: debits = amount; break;
        case WalletLedgerType.REFUND: refunds = amount; break;
        case WalletLedgerType.HOLD: holds = amount; break;
        case WalletLedgerType.RELEASE: releases = amount; break;
      }
    });

    const totalEquity = credits + refunds - debits;
    // Pending/Locked is net holds not yet released
    // Ensure we don't go negative on locks if data is weird, though it shouldn't be.
    const lockedCents = Math.max(0, holds - releases);

    // Withdrawable
    const withdrawableCents = Math.max(0, totalEquity - lockedCents);

    return {
      balanceCents: totalEquity,
      pendingCents: lockedCents,
      withdrawableCents
    };
  }

  /**
   * Get ledger entries for a user
   */
  async getLedgerEntries(
    userId: string,
    currency: Currency = Currency.USD,
    limit: number = 50
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
  async search(params: {
    userId?: string;
    type?: WalletLedgerType;
    sourceType?: WalletLedgerSourceType;
    sourceId?: string;
    limit?: number;
    cursor?: string;
  }) {
    const { userId, type, sourceType, sourceId, limit = 50, cursor } = params;
    const where: Prisma.WalletLedgerWhereInput = {};
    if (userId) where.userId = userId;
    if (type) where.type = type;
    if (sourceType) where.sourceType = sourceType;
    if (sourceId) where.sourceId = sourceId;

    return this.prisma.walletLedger.findMany({
      where,
      take: limit,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: 'desc' }
    });
  }

  async getEntry(id: string) {
    return this.prisma.walletLedger.findUnique({ where: { id } });
  }
}

