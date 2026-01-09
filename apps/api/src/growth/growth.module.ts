import { Module, Global } from '@nestjs/common';
import { ReferralsService } from './referrals/referrals.service';
import { ReferralsController } from './referrals/referrals.controller';
import { PromosService } from './promos/promos.service';
import { PromosController } from './promos/promos.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { WalletModule } from '../wallet/wallet.module';
import { PricingModule } from '../pricing/pricing.module';

@Global()
@Module({
    imports: [PrismaModule, WalletModule, PricingModule],
    controllers: [ReferralsController, PromosController],
    providers: [ReferralsService, PromosService],
    exports: [ReferralsService, PromosService]
})
export class GrowthModule { }
