import { Module } from '@nestjs/common';
import { RewardsService } from './rewards.service';
import { RewardsController } from './rewards.controller';
import { AdminRewardsController } from './admin-rewards.controller';
import { RewardCron } from './cron/reward.cron';
import { WalletsModule } from '../wallets/wallets.module';

@Module({
  imports: [WalletsModule],
  providers: [RewardsService, RewardCron],
  controllers: [RewardsController, AdminRewardsController],
  exports: [RewardsService],
})
export class RewardsModule { }
