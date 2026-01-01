import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DistributionEngine } from '../engine/distribution.engine';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RewardCron {
    constructor(
        private engine: DistributionEngine,
        private prisma: PrismaService,
    ) { }

    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async handleDailyRewards() {
        const activePools = await this.prisma.rewardPool.findMany({
            where: { isActive: true },
        });

        for (const pool of activePools) {
            await this.engine.distributePool(pool.id);
        }
    }
}
