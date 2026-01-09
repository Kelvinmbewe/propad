import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PricingService } from '../pricing/pricing.service';

@Injectable()
export class RewardsService {
  constructor(
    private prisma: PrismaService,
    private pricingService: PricingService
  ) { }

  async getUserRewards(userId: string) {
    return this.prisma.rewardDistribution.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getRewardPools() {
    return this.prisma.rewardPool.findMany({
      where: { isActive: true },
    });
  }

  async distributeRewards() {
    // 1. Calculate unspent revenue
    const metrics = await this.prisma.metricDailyRevenue.aggregate({
      _sum: { grossUsdCents: true, payoutsUsdCents: true }
    });

    // Total revenue ever
    const grossTotal = Number(metrics._sum.grossUsdCents || 0);
    // Total payouts (technically distributions already allocated, but simplified here as distributions table)
    const distributions = await this.prisma.rewardDistribution.aggregate({
      _sum: { amountCents: true }
    });
    const distributedTotal = distributions._sum.amountCents || 0;

    const unallocated = grossTotal - distributedTotal;

    if (unallocated <= 0) {
      return { message: 'No new revenue to distribute', unallocated };
    }

    // 2. Define Split Rules (From Pricing Config)
    const splitConfig = await this.pricingService.getConfig('REWARD_SPLIT', {
      agentPct: 10,
      verifierPct: 5
    });

    const agentPoolShare = Math.floor(unallocated * (splitConfig.agentPct / 100));
    const verifierPoolShare = Math.floor(unallocated * (splitConfig.verifierPct / 100));

    // 3. Find eligible users
    // For MVP, distributing equally to active agents
    const activeAgents = await this.prisma.user.findMany({
      where: { role: 'AGENT' }, // Simplified
      take: 100
    });

    if (activeAgents.length === 0) {
      return { message: 'No agents found to distribute to', unallocated };
    }

    const amountPerAgent = Math.floor(agentPoolShare / activeAgents.length);

    const results = [];

    if (amountPerAgent > 0) {
      const pool = await this.prisma.rewardPool.findFirst({ where: { name: 'Agent Pool' } });
      let poolId = pool?.id;

      if (!poolId) {
        const newPool = await this.prisma.rewardPool.create({
          data: { name: 'Agent Pool', currency: 'USD' }
        });
        poolId = newPool.id;
      }

      for (const agent of activeAgents) {
        // Create Distribution Record
        const dist = await this.prisma.rewardDistribution.create({
          data: {
            poolId,
            userId: agent.id,
            amountCents: amountPerAgent,
            currency: 'USD',
            reason: 'Weekly Agent Pool Share',
            status: 'PROCESSED',
            processedAt: new Date(),
          }
        });

        // Credit Wallet Ledger
        await this.prisma.walletLedger.create({
          data: {
            userId: agent.id,
            type: 'CREDIT',
            sourceType: 'REWARD',
            amountCents: amountPerAgent,
            currency: 'USD',
            rewardDistributionId: dist.id
          }
        });

        results.push({ agentId: agent.id, amount: amountPerAgent });
      }
    }

    return {
      distributed: results.length,
      amountPerAgent,
      totalDistributed: results.length * amountPerAgent
    };
  }
}
