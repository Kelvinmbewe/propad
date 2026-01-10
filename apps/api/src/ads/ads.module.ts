import { Module } from '@nestjs/common';
import { AdsService } from './ads.service';
import { AdsController } from './ads.controller';
import { AdEventsService } from './events/ad-events.service';
import { AdvertiserBalanceService } from './advertiser-balance.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  providers: [AdsService, AdEventsService, AdvertiserBalanceService],
  controllers: [AdsController],
  exports: [AdsService, AdEventsService, AdvertiserBalanceService],
})
export class AdsModule { }
