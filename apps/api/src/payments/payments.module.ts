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
import { WalletsModule } from '../wallets/wallets.module';
import { CommissionsModule } from '../commissions/commissions.module';
import { RewardsModule } from '../rewards/rewards.module';
import { FeatureAccessService } from './feature-access.service';
import { FeatureAccessController } from './feature-access.controller';
import { PaynowPayoutGateway } from './gateways/paynow-payout.gateway';
import { StripePayoutGateway } from './gateways/stripe-payout.gateway';
import { PayPalPayoutGateway } from './gateways/paypal-payout.gateway';
import { PAYOUT_GATEWAYS } from './payments.constants';
import { PayoutGatewayRegistry } from './payout-gateway.registry';

@Module({
  imports: [PrismaModule, AuditModule, HttpModule, MailModule, WalletsModule, CommissionsModule, RewardsModule],
  controllers: [
    PaymentsController,
    PaymentMethodsController,
    PaymentProviderSettingsController,
    PricingController,
    PayoutsController,
    ReferralsController,
    FeatureAccessController
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
    FeatureAccessService,
    PaynowGateway,
    PaymentGatewayRegistry,
    PaynowPayoutGateway,
    StripePayoutGateway,
    PayPalPayoutGateway,
    PayoutGatewayRegistry,
    {
      provide: PAYMENT_GATEWAYS,
      useFactory: (paynow: PaynowGateway) => [paynow],
      inject: [PaynowGateway]
    },
    {
      provide: PAYOUT_GATEWAYS,
      useFactory: (
        paynow: PaynowPayoutGateway,
        stripe: StripePayoutGateway,
        paypal: PayPalPayoutGateway
      ) => [paynow, stripe, paypal],
      inject: [PaynowPayoutGateway, StripePayoutGateway, PayPalPayoutGateway]
    }
  ],
  exports: [PaymentsService, PricingService, PayoutsService, ReferralsService, PaymentRequiredGuard, FeatureAccessService]
})
export class PaymentsModule { }
