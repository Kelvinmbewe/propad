import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RewardsService {
  constructor(private prisma: PrismaService) { }

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
}
