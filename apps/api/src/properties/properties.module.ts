import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { GeoModule } from '../geo/geo.module';
import { PropertiesController } from './properties.controller';
import { PropertiesService } from './properties.service';
import { OfferAutoConfirmationService } from './offer-auto-confirmation.service';

import { RankingModule } from '../ranking/ranking.module';

@Module({
  imports: [PrismaModule, AuditModule, GeoModule, VerificationsModule, RankingModule],
  controllers: [PropertiesController],
  providers: [PropertiesService, OfferAutoConfirmationService],
  exports: [PropertiesService]
})
export class PropertiesModule { }
