import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { PaymentsModule } from '../payments/payments.module';
import { AppConfigModule } from '../app-config/app-config.module';
import { AdsModule } from '../ads/ads.module';
import { PricingModule } from '../pricing/pricing.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { IncentivesDashboardService } from './incentives-dashboard.service';
import { IncentivesDashboardController } from './incentives-dashboard.controller';
import { IncentivesManifestService } from './incentives-manifest.service';
import { ManifestController } from './manifest.controller';

@Module({
  imports: [PrismaModule, AuditModule, PaymentsModule, AppConfigModule, AdsModule, PricingModule],
  controllers: [AdminController, IncentivesDashboardController, ManifestController],
  providers: [AdminService, IncentivesDashboardService, IncentivesManifestService],
  exports: [IncentivesDashboardService, IncentivesManifestService]
})
export class AdminModule { }

