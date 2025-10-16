import { Injectable } from '@nestjs/common';
import { addDays, startOfMonth } from 'date-fns';
import { Currency, OwnerType, WalletTransactionSource } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateRewardEventDto } from './dto/create-reward-event.dto';
import { WalletsService } from '../wallets/wallets.service';
import { env } from '@propad/config';

@Injectable()
export class RewardsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly wallets: WalletsService
  ) {}

  async create(dto: CreateRewardEventDto) {
    const reward = await this.prisma.rewardEvent.create({
      data: {
        agentId: dto.agentId,
        type: dto.type,
        points: dto.points,
        usdCents: dto.usdCents,
        refId: dto.refId
      }
    });

    if (dto.usdCents > 0) {
      await this.wallets.creditWallet({
        ownerType: OwnerType.USER,
        ownerId: dto.agentId,
        amountCents: dto.usdCents,
        source: WalletTransactionSource.REWARD_EVENT,
        sourceId: reward.id,
        description: `Reward ${dto.type}`
      });
    }

    await this.audit.log({
      action: 'reward.create',
      actorId: dto.agentId,
      targetType: 'rewardEvent',
      targetId: reward.id,
      metadata: { type: dto.type, usdCents: dto.usdCents }
    });

    return reward;
  }

  list(agentId?: string) {
    return this.prisma.rewardEvent.findMany({
      where: agentId ? { agentId } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 200
    });
  }

  async poolSummary() {
    const [totals, agents] = await Promise.all([
      this.prisma.rewardEvent.aggregate({
        _sum: { points: true, usdCents: true },
        _count: { _all: true }
      }),
      this.prisma.rewardEvent.groupBy({
        by: ['agentId'],
        _sum: { usdCents: true, points: true },
        orderBy: { _sum: { usdCents: 'desc' } },
        take: 5
      })
    ]);

    return {
      totals,
      topAgents: agents
    };
  }

  async agentMonthlyEstimate(agentId: string) {
    const now = new Date();
    const start = startOfMonth(now);

    const [events, wallet, revenueAggregate] = await Promise.all([
      this.prisma.rewardEvent.aggregate({
        where: { agentId, createdAt: { gte: start } },
        _sum: { usdCents: true, points: true },
        _count: { _all: true }
      }),
      this.prisma.wallet.findUnique({
        where: {
          ownerType_ownerId_currency: {
            ownerType: OwnerType.USER,
            ownerId: agentId,
            currency: Currency.USD
          }
        }
      }),
      this.prisma.metricDailyRevenue.aggregate({
        where: { date: { gte: start } },
        _sum: { grossUsdCents: true }
      })
    ]);

    const usdCents = events._sum.usdCents ?? 0;
    const points = events._sum.points ?? 0;
    const walletBalance = wallet?.balanceCents ?? 0;
    const walletPending = wallet?.pendingCents ?? 0;
    const grossUsdCents = this.toNumber(revenueAggregate._sum.grossUsdCents);
    const poolUsdCents = Math.round(grossUsdCents * env.ADSERVER_REWARD_SHARE);
    const projectedUsd = usdCents / 100;

    return {
      agentId,
      generatedAt: now.toISOString(),
      monthStart: start.toISOString(),
      projectedUsd,
      projectedPoints: points,
      events: events._count._all,
      walletBalanceUsd: walletBalance / 100,
      pendingWalletUsd: walletPending / 100,
      poolUsd: poolUsdCents / 100,
      estimatedShareUsd: Math.min(projectedUsd, poolUsdCents / 100),
      nextPayoutEta: addDays(start, env.WALLET_EARNINGS_COOL_OFF_DAYS).toISOString()
    };
  }

  private toNumber(value: bigint | number | null | undefined) {
    if (value === null || value === undefined) {
      return 0;
    }
    return typeof value === 'bigint' ? Number(value) : value;
  }
}
