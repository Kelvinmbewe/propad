import { AdsInvoicesService } from './ads-invoices.service';

@Module({
  imports: [AuditModule],
  providers: [AdsService, AdEventsService, AdvertiserBalanceService, AdsInvoicesService],
  controllers: [AdsController],
  exports: [AdsService, AdEventsService, AdvertiserBalanceService, AdsInvoicesService],
})
export class AdsModule { }
