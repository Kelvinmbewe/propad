import { Module } from '@nestjs/common';
import { AdsService } from './ads.service';
import { AdsController } from './ads.controller';
import { AdEventsService } from './events/ad-events.service';
import { AdvertiserBalanceService } from './advertiser-balance.service';
import { AuditModule } from '../audit/audit.module';
import { AdsInvoicesService } from './ads-invoices.service';

@Module({
  imports: [AuditModule],
  providers: [AdsService, AdEventsService, AdvertiserBalanceService, AdsInvoicesService],
  controllers: [AdsController],
  exports: [AdsService, AdEventsService, AdvertiserBalanceService, AdsInvoicesService],
})
export class AdsModule { }
