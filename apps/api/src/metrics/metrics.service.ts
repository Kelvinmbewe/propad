import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MetricsService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard() {
    const [activeListings, pendingVerifications, rewardPool] = await Promise.all([
      this.prisma.listing.count({ where: { status: 'ACTIVE' } }),
      this.prisma.listing.count({ where: { status: 'PENDING' } }),
      this.prisma.rewardPool.findFirst({ orderBy: { createdAt: 'desc' } })
    ]);

    return {
      activeListings,
      pendingVerifications,
      rewardPoolUsd: rewardPool?.balanceUsd ?? 0
    };
  }
}
