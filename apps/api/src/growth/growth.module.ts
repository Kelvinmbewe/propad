import { Module, Global } from '@nestjs/common';
import { ReferralsService } from './referrals/referrals.service';
import { ReferralsController } from './referrals/referrals.controller';
import { AdminReferralsController } from './referrals/admin-referrals.controller';
import { PromosService } from './promos/promos.service';
import { PromosController } from './promos/promos.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { WalletsModule } from '../wallets/wallets.module';
import { PricingModule } from '../pricing/pricing.module';
import { RewardsModule } from '../rewards/rewards.module';

@Global()
@Module({
    imports: [PrismaModule, WalletsModule, PricingModule, RewardsModule],
    controllers: [ReferralsController, AdminReferralsController, PromosController],
    providers: [ReferralsService, PromosService],
    exports: [ReferralsService, PromosService]
})
export class GrowthModule { }
