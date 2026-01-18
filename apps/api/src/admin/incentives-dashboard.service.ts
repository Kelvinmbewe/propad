import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Currency } from "@prisma/client";

export interface IncentivesOverview {
  totalRewardsDistributedCents: number;
  totalCommissionsPaidCents: number;
  activeRewardPools: number;
  pendingPayouts: number;
  updatedAt: Date;
}

export interface TopEarner {
  userId: string;
  userName: string;
  email: string;
  totalEarnedCents: number;
  rewardCount: number;
  commissionCount: number;
}

export interface SourceDistribution {
  source: string;
  totalAmountCents: number;
  count: number;
  percentage: number;
}

export interface Anomaly {
  type: "SPIKE" | "UNUSUAL_PATTERN" | "HIGH_FREQUENCY";
  severity: "LOW" | "MEDIUM" | "HIGH";
  userId?: string;
  description: string;
  detectedAt: Date;
  metadata?: Record<string, any>;
}

@Injectable()
export class IncentivesDashboardService {
  private readonly logger = new Logger(IncentivesDashboardService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get overall incentives overview
   */
  async getOverview(): Promise<IncentivesOverview> {
    const [totalRewards, totalCommissions, activePools, pendingPayouts] =
      await Promise.all([
        this.prisma.rewardDistribution.aggregate({
          where: { status: "PROCESSED" },
          _sum: { amountCents: true },
        }),
        this.prisma.commission.aggregate({
          where: { status: "PAID" },
          _sum: { amountCents: true },
        }),
        this.prisma.rewardPool.count({
          where: { isActive: true },
        }),
        this.prisma.payoutRequest.count({
          where: { status: "REQUESTED" },
        }),
      ]);

    return {
      totalRewardsDistributedCents: totalRewards._sum.amountCents || 0,
      totalCommissionsPaidCents: totalCommissions._sum.amountCents || 0,
      activeRewardPools: activePools,
      pendingPayouts: pendingPayouts,
      updatedAt: new Date(),
    };
  }

  /**
   * Get top earners for a given period
   */
  async getTopEarners(
    period: "day" | "week" | "month" | "all" = "month",
    limit: number = 50,
  ): Promise<TopEarner[]> {
    const now = new Date();
    let startDate: Date | undefined;

    switch (period) {
      case "day":
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "all":
        startDate = undefined;
        break;
    }

    const whereClause = startDate ? { createdAt: { gte: startDate } } : {};

    // Get reward earnings
    const rewardEarnings = await this.prisma.rewardDistribution.groupBy({
      by: ["userId"],
      where: {
        ...whereClause,
        status: "PROCESSED",
      },
      _sum: { amountCents: true },
      _count: true,
      orderBy: { _sum: { amountCents: "desc" } },
      take: limit,
    });

    // Get commission earnings
    const commissionEarnings = await this.prisma.commission.groupBy({
      by: ["agentId"],
      where: {
        ...whereClause,
        status: "PAID",
      },
      _sum: { amountCents: true },
      _count: true,
    });

    // Merge and calculate totals
    const earnerMap = new Map<
      string,
      {
        rewards: number;
        commissions: number;
        rewardCount: number;
        commissionCount: number;
      }
    >();

    for (const r of rewardEarnings) {
      earnerMap.set(r.userId, {
        rewards: r._sum.amountCents || 0,
        commissions: 0,
        rewardCount: r._count,
        commissionCount: 0,
      });
    }

    for (const c of commissionEarnings) {
      const existing = earnerMap.get(c.agentId) || {
        rewards: 0,
        commissions: 0,
        rewardCount: 0,
        commissionCount: 0,
      };
      existing.commissions = c._sum.amountCents || 0;
      existing.commissionCount = c._count;
      earnerMap.set(c.agentId, existing);
    }

    // Get user details
    const userIds = Array.from(earnerMap.keys());
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true },
    });

    const userMap = new Map<
      string,
      { id: string; name: string | null; email: string | null }
    >(
      users.map(
        (u: { id: string; name: string | null; email: string | null }) => [
          u.id,
          u,
        ],
      ),
    );

    // Build result
    const result: TopEarner[] = [];
    for (const [userId, earnings] of earnerMap) {
      const user = userMap.get(userId);
      result.push({
        userId,
        userName: user?.name || "Unknown",
        email: user?.email || "",
        totalEarnedCents: earnings.rewards + earnings.commissions,
        rewardCount: earnings.rewardCount,
        commissionCount: earnings.commissionCount,
      });
    }

    // Sort by total earned
    result.sort((a, b) => b.totalEarnedCents - a.totalEarnedCents);

    return result.slice(0, limit);
  }

  /**
   * Get distribution of incentives by source type
   */
  async getSourceDistribution(): Promise<SourceDistribution[]> {
    const distributions = await this.prisma.rewardDistribution.groupBy({
      by: ["reason"],
      where: { status: "PROCESSED" },
      _sum: { amountCents: true },
      _count: true,
    });

    const total = distributions.reduce(
      (sum: number, d: { _sum: { amountCents: number | null } }) =>
        sum + (d._sum.amountCents || 0),
      0,
    );

    return distributions.map(
      (d: {
        reason: string | null;
        _sum: { amountCents: number | null };
        _count: number;
      }) => ({
        source: d.reason || "Other",
        totalAmountCents: d._sum.amountCents || 0,
        count: d._count,
        percentage: total > 0 ? ((d._sum.amountCents || 0) / total) * 100 : 0,
      }),
    );
  }

  /**
   * Detect anomalies in incentive patterns
   */
  async getAnomalies(): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Check for reward spikes (2x average)
    const [avgDaily, todayCount] = await Promise.all([
      this.prisma.rewardDistribution.count({
        where: {
          createdAt: { gte: oneWeekAgo, lt: oneDayAgo },
        },
      }),
      this.prisma.rewardDistribution.count({
        where: {
          createdAt: { gte: oneDayAgo },
        },
      }),
    ]);

    const avgDailyCount = avgDaily / 6; // 6 days
    if (todayCount > avgDailyCount * 2 && todayCount > 10) {
      anomalies.push({
        type: "SPIKE",
        severity: "HIGH",
        description: `Reward distribution spike detected: ${todayCount} today vs ${Math.round(avgDailyCount)} average`,
        detectedAt: now,
        metadata: { todayCount, avgDailyCount },
      });
    }

    // Check for high-frequency users (more than 5 rewards in 24h)
    const highFreqUsers = await this.prisma.rewardDistribution.groupBy({
      by: ["userId"],
      where: {
        createdAt: { gte: oneDayAgo },
      },
      _count: true,
      having: {
        userId: {
          _count: { gt: 5 },
        },
      },
    });

    for (const user of highFreqUsers) {
      anomalies.push({
        type: "HIGH_FREQUENCY",
        severity: "MEDIUM",
        userId: user.userId,
        description: `User received ${user._count} rewards in 24 hours`,
        detectedAt: now,
        metadata: { rewardCount: user._count },
      });
    }

    return anomalies;
  }
}
