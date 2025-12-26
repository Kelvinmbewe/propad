import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { MailModule } from '../mail/mail.module';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PaynowGateway } from './gateways/paynow.gateway';
import { PAYMENT_GATEWAYS } from './payments.constants';
import { PaymentGatewayRegistry } from './payment-gateway.registry';
import { PaymentMethodsService } from './payment-methods.service';
import { PaymentMethodsController } from './payment-methods.controller';
import { PaymentProviderSettingsService } from './payment-provider-settings.service';
import { PaymentProviderSettingsController } from './payment-provider-settings.controller';
import { PricingService } from './pricing.service';
import { PricingController } from './pricing.controller';
import { PayoutsService } from './payouts.service';
import { PayoutsController } from './payouts.controller';
import { ReferralsService } from './referrals.service';
import { ReferralsController } from './referrals.controller';
import { PaymentPollingService } from './payment-polling.service';
import { PaymentRequiredGuard } from './guards/payment-required.guard';

@Module({
  imports: [PrismaModule, AuditModule, HttpModule, MailModule],
  controllers: [
    PaymentsController,
    PaymentMethodsController,
    PaymentProviderSettingsController,
    PricingController,
    PayoutsController,
    ReferralsController
  ],
  providers: [
    PaymentsService,
    PaymentMethodsService,
    PaymentProviderSettingsService,
    PricingService,
    PayoutsService,
    ReferralsService,
    PaymentPollingService,
    PaymentRequiredGuard,
    PaynowGateway,
    PaymentGatewayRegistry,
    {
      provide: PAYMENT_GATEWAYS,
      useFactory: (paynow: PaynowGateway) => [paynow],
      inject: [PaynowGateway]
    }
  ],
  exports: [PaymentsService, PricingService, PayoutsService, ReferralsService, PaymentRequiredGuard]
})
export class PaymentsModule {}
