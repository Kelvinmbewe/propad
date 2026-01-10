import { Module } from '@nestjs/common';
import { AdsService } from './ads.service';
import { AdsCron } from './ads.cron';
import { AdsController } from './ads.controller';
import { AdEventsService } from './events/ad-events.service';
import { AdvertiserBalanceService } from './advertiser-balance.service';
import { AuditModule } from '../audit/audit.module';
import { AdsInvoicesService } from './ads-invoices.service';
import { FraudDetectionService } from './fraud/fraud-detection.service';

import { AdsFraudController } from './ads-fraud.controller';

@Module({
  imports: [AuditModule],
  providers: [AdsService, AdsCron, AdEventsService, AdvertiserBalanceService, AdsInvoicesService, FraudDetectionService],
  controllers: [AdsController, AdsFraudController],
  exports: [AdsService, AdEventsService, AdvertiserBalanceService, AdsInvoicesService, FraudDetectionService],
})
export class AdsModule { }
