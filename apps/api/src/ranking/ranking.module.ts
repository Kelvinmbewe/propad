import { Module } from '@nestjs/common';
import { RankingService } from './ranking.service';
import { TrustModule } from '../trust/trust.module';
import { MonetizationModule } from '../monetization/monetization.module';

@Module({
    imports: [TrustModule, MonetizationModule],
    providers: [RankingService],
    exports: [RankingService],
})
export class RankingModule { }
