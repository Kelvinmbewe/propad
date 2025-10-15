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

    return {
      activeListings,
      pendingVerifications,
      rewardPoolUsd: ((rewardSummary._sum.usdCents ?? 0) / 100) || 0
    };
  }
}
