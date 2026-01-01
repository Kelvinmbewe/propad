import { Module } from '@nestjs/common';
import { RewardsService } from './rewards.service';
import { RewardsController } from './rewards.controller';
import { DistributionEngine } from './engine/distribution.engine';
import { RewardCron } from './cron/reward.cron';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [WalletModule],
  providers: [RewardsService, DistributionEngine, RewardCron],
  controllers: [RewardsController],
  exports: [RewardsService, DistributionEngine],
})
export class RewardsModule { }
