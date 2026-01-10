import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RewardsService } from '../rewards.service';

@Injectable()
export class RewardCron {
    private readonly logger = new Logger(RewardCron.name);

    constructor(
        private rewardsService: RewardsService,
    ) { }

    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async handleDailyRewards() {
        this.logger.log('Starting daily revenue share distribution...');
        try {
            const result = await this.rewardsService.triggerRevenueShareDistribution();
            this.logger.log('Daily revenue share completed', result);
        } catch (error) {
            this.logger.error('Failed to process daily revenue share', error);
        }
    }
}
