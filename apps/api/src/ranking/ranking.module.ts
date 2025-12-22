import { Module } from '@nestjs/common';
import { RankingService } from './ranking.service';
import { TrustModule } from '../trust/trust.module';

@Module({
    imports: [TrustModule],
    providers: [RankingService],
    exports: [RankingService],
})
export class RankingModule { }
