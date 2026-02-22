import { Module } from '@nestjs/common';
import { AdSenseService } from './adsense.service';
import { AdSenseController } from './adsense.controller';
import { PrismaService } from '../prisma/prisma.service';
import { AdSenseCron } from './cron/adsense.cron';
import { RewardsModule } from '../rewards/rewards.module';

@Module({
    imports: [RewardsModule],
    controllers: [AdSenseController],
    providers: [AdSenseService, PrismaService, AdSenseCron],
    exports: [AdSenseService],
})
export class AdSenseModule { }
