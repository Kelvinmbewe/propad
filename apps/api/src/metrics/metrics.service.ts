import { Injectable } from '@nestjs/common';
import { PropertyStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MetricsService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard() {
    const [activeListings, pendingVerifications, rewardSummary] = await Promise.all([
      this.prisma.property.count({ where: { status: PropertyStatus.VERIFIED } }),
      this.prisma.property.count({ where: { status: PropertyStatus.PENDING_VERIFY } }),
      this.prisma.rewardEvent.aggregate({ _sum: { usdCents: true } })
    ]);

    const rewardCentsRaw = rewardSummary._sum.usdCents;
    const rewardCents = normalizeDecimal(rewardCentsRaw);

    return {
      activeListings,
      pendingVerifications,
      rewardPoolUsd: rewardCents / 100
    };
  }
}

function normalizeDecimal(value: unknown): number {
  if (value === null || value === undefined) {
    return 0;
  }

  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  if (typeof value === 'object') {
    const maybeDecimal = value as { toNumber?: () => number };
    if (typeof maybeDecimal.toNumber === 'function') {
      try {
        return maybeDecimal.toNumber();
      } catch (error) {
        return 0;
      }
    }
  }

  return 0;
}
