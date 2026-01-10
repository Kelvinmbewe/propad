import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PricingService } from '../pricing/pricing.service';
import { WalletLedgerService } from '../wallets/wallet-ledger.service';
import {
  RewardEventType,
  Currency,
  WalletLedgerSourceType,
  Prisma,
  RewardDistribution
} from '@prisma/client';

@Injectable()
export class RewardsService {
  private readonly logger = new Logger(RewardsService.name);

  constructor(
    private prisma: PrismaService,
    private pricingService: PricingService,
    private ledger: WalletLedgerService
  ) { }

  /**
   * Get rewards for a specific user
   */
  async getUserRewards(userId: string) {
    return this.prisma.rewardDistribution.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        pool: {
          select: { name: true, currency: true }
        }
      }
    });
  }

  /**
   * Get all active reward pools
   */
  async getRewardPools() {
    return this.prisma.rewardPool.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: { distributions: true }
        }
      }
    });
  }

  /**
   * Trigger: Verification Approved
   * Award points/cash to the verifier
   */
  async triggerVerificationReward(verificationId: string, verifierId: string) {
    // 1. Get Config
    const rewardAmount = await this.pricingService.getConfig<number>(
      'REWARD_VERIFICATION_CENTS',
      500 // $5.00 default
    );

    if (rewardAmount <= 0) return;

    // 2. Distribute
    return this.distributeReward({
      userId: verifierId,
      amountCents: rewardAmount,
      currency: Currency.USD,
      sourceType: RewardEventType.VERIFICATION_APPROVAL,
      sourceId: verificationId,
      detail: 'Verification approved successfully',
      poolName: 'Verification Rewards'
    });
  }

  /**
   * Trigger: Deal Completed
   * Award commission/bonus to agent
   */
  async triggerDealReward(dealId: string, agentId: string, dealValueCents: number) {
    // 1. Get Config (e.g. 1% of deal value as bonus from platform? Or specific fixed bonus?)
    // This is separate from the standard commission invoice. This is a "Reward".
    const bonusBps = await this.pricingService.getConfig<number>(
      'REWARD_DEAL_BONUS_BPS',
      0 // Default 0, maybe disabled
    );

    if (bonusBps <= 0) return;

    const amount = Math.floor(dealValueCents * (bonusBps / 10000));
    if (amount <= 0) return;

    return this.distributeReward({
      userId: agentId,
      amountCents: amount,
      currency: Currency.USD,
      sourceType: RewardEventType.DEAL_COMPLETION,
      sourceId: dealId,
      detail: 'Deal completion bonus',
      poolName: 'Agent Incentives'
    });
  }

  /**
   * Core Private Distribution Method
   * Atomic Transaction: Pool Deduct + Distribution Record + Ledger Credit
   */
  private async distributeReward(params: {
    userId: string;
    amountCents: number;
    currency: Currency;
    sourceType: RewardEventType;
    sourceId: string;
    detail: string;
    poolName: string; // fallback if pool not found by precise ID, look up by name
    poolId?: string;
  }): Promise<RewardDistribution> {
    const { userId, amountCents, currency, sourceType, sourceId, detail, poolName } = params;

    return this.prisma.$transaction(async (tx) => {
      // 1. Check Idempotency
      const existing = await tx.rewardDistribution.findFirst({
        where: {
          userId,
          sourceType,
          sourceId
        }
      });

      if (existing) {
        this.logger.warn(`Duplicate reward attempt: ${sourceType} for ${sourceId}`);
        return existing;
      }

      // 2. Find and Lock Pool
      // We look for a pool by name if ID not provided.
      // We might want to lock specific rows using raw query or just rely on atomic update with where clause.
      let pool = params.poolId
        ? await tx.rewardPool.findUnique({ where: { id: params.poolId } })
        : await tx.rewardPool.findFirst({ where: { name: poolName, currency } });

      if (!pool) {
        // Auto-create pool if missing? Or fail? 
        // For robustness, let's create if missing, but typically pools should be pre-seeded.
        // Failing is safer to force Admin config.
        throw new BadRequestException(`Reward pool '${poolName}' not found`);
      }

      if (!pool.isActive) {
        throw new BadRequestException(`Reward pool '${pool.name}' is inactive`);
      }

      // 3. Check Balance
      const remaining = pool.totalUsdCents - pool.spentUsdCents;
      if (remaining < amountCents) {
        // Auto-close logic?
        if (remaining <= 0) {
          await tx.rewardPool.update({
            where: { id: pool.id },
            data: { isActive: false }
          });
        }
        throw new BadRequestException(`Insufficient funds in pool '${pool.name}'`);
      }

      // 4. Update Pool
      await tx.rewardPool.update({
        where: { id: pool.id },
        data: {
          spentUsdCents: { increment: amountCents }
        }
      });

      // 5. Create Distribution Record
      const dist = await tx.rewardDistribution.create({
        data: {
          poolId: pool.id,
          userId,
          amountCents,
          currency,
          sourceType,
          sourceId,
          reason: detail,
          status: 'PROCESSED',
          processedAt: new Date(),
        }
      });

      // 6. Ledger Update
      await this.ledger.credit(
        userId,
        amountCents,
        currency,
        WalletLedgerSourceType.REWARD_EARNED,
        dist.id,
        detail,
        tx
      );

      return dist;
    });
  }

  /**
   * Bulk Distribution for Revenue Share (Scheduled Task)
   * This replaces the old 'distributeRewards' method
   */
  async triggerRevenueShareDistribution() {
    // 1. Calculate unspent revenue
    const metrics = await this.prisma.metricDailyRevenue.aggregate({
      _sum: { grossUsdCents: true }
    });

    // This logic needs to be robust: we need to track "last distribution point" or "unallocated revenue".
    // For MVP, we'll assume we distribute based on what's available in a "Revenue Share Pool" 
    // that is funded by a separate process (e.g. at month end, Finance moves $$ to Pool).

    // ALTERNATIVE: Calculate dynamically from platform profit.
    // For safety, let's look for a specialized pool "Ad Revenue Share" and distribute its contents.

    const pool = await this.prisma.rewardPool.findFirst({
      where: { name: 'Ad Revenue Share', isActive: true }
    });

    if (!pool) return { message: 'No active Ad Revenue Share pool found' };

    const distributable = pool.totalUsdCents - pool.spentUsdCents;
    if (distributable <= 0) return { message: 'No funds in Ad Revenue Share pool' };

    // 2. Fetch Splits
    const splitConfig = await this.pricingService.getConfig('REWARD_SPLIT', {
      agentPct: 10,
      verifierPct: 5
    });

    // We only distribute what is allocated to this pool.
    // Assuming the Pool IS the allocation.

    // 3. Find Eligible Users (Active Agents)
    const activeAgents = await this.prisma.user.findMany({
      where: { role: 'AGENT', status: 'ACTIVE' },
      take: 500
    });

    if (activeAgents.length === 0) return { message: 'No agents found' };

    const amountPerAgent = Math.floor(distributable / activeAgents.length);
    if (amountPerAgent < 10) return { message: 'Amount too small to distribute' }; // < 10 cents

    let count = 0;
    for (const agent of activeAgents) {
      try {
        await this.distributeReward({
          userId: agent.id,
          amountCents: amountPerAgent,
          currency: Currency.USD,
          sourceType: RewardEventType.AD_REVENUE_SHARE,
          sourceId: `REVSHARE-${new Date().toISOString().slice(0, 10)}`, // Daily/Weekly ID
          detail: 'Periodic Revenue Share',
          poolName: 'Ad Revenue Share',
          poolId: pool.id
        });
        count++;
      } catch (e) {
        this.logger.error(`Failed to distribute revshare to ${agent.id}`, e);
      }
    }

    return { distributed: count, amountPerAgent };
  }
}
