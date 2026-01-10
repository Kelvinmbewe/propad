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
import { PayoutGatewayRegistry } from './payout-gateway.registry';
import { PaymentProviderSettingsService } from './payment-provider-settings.service';
import { PricingService } from './pricing.service';
import { WebhookController } from './webhook.controller';
import { AuditService } from '../audit/audit.service';

@Module({
    imports: [PrismaModule, WalletModule],
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
    ],
    exports: [PayoutsService]
})
export class PayoutsModule { }
