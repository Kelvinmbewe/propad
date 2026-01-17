
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { GeoModule } from '../geo/geo.module';
import { PropertiesController } from './properties.controller';
import { PropertiesService } from './properties.service';
import { OfferAutoConfirmationService } from './offer-auto-confirmation.service';
import { VerificationsModule } from '../verifications/verifications.module';
import { TrustModule } from '../trust/trust.module';
import { RankingModule } from '../ranking/ranking.module';

import { PaymentsModule } from '../payments/payments.module';

import { PricingModule } from '../pricing/pricing.module';

@Module({
  imports: [PrismaModule, AuditModule, GeoModule, VerificationsModule, TrustModule, RankingModule, PaymentsModule, PricingModule],
  controllers: [PropertiesController],
  providers: [PropertiesService, OfferAutoConfirmationService],
  exports: [PropertiesService]
})
export class PropertiesModule { }
