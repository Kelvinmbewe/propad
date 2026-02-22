import { Module } from '@nestjs/common';
import { PayoutsService } from './payouts.service';
import { PayoutsController } from './payouts.controller';
import { AdminPayoutsController } from './admin-payouts.controller';
import { PrismaService } from '../prisma/prisma.service';
import { PaynowProvider } from './providers/paynow.provider';
import { BankProvider } from './providers/bank.provider';
import { ManualProvider } from './providers/manual.provider';
import { WalletModule } from '../wallet/wallet.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PayoutGatewayRegistry } from '../payments/payout-gateway.registry';
import { PAYOUT_GATEWAYS } from '../payments/payments.constants';
import { PaymentProviderSettingsService } from '../payments/payment-provider-settings.service';
import { PricingService } from '../payments/pricing.service';
import { WebhookController } from './webhook.controller';
import { AuditService } from '../audit/audit.service';

import { WalletsModule } from '../wallets/wallets.module';

@Module({
    imports: [PrismaModule, WalletModule, WalletsModule],
    controllers: [PayoutsController, AdminPayoutsController, WebhookController],
    providers: [
        PayoutsService,
        PrismaService,
        AuditService,
        PayoutGatewayRegistry,
        PaymentProviderSettingsService,
        PricingService,
        PaynowProvider,
        BankProvider,
        ManualProvider,
        {
            provide: PAYOUT_GATEWAYS,
            useFactory: (paynow: PaynowProvider, bank: BankProvider, manual: ManualProvider) => [paynow, bank, manual],
            inject: [PaynowProvider, BankProvider, ManualProvider],
        }
    ],
    exports: [PayoutsService]
})
export class PayoutsModule { }
