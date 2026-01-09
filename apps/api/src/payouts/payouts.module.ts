import { Module } from '@nestjs/common';
import { PayoutsService } from './payouts.service';
import { PayoutsController } from './payouts.controller';
import { PrismaService } from '../prisma/prisma.service';
import { PaynowProvider } from './providers/paynow.provider';
import { BankProvider } from './providers/bank.provider';
import { ManualProvider } from './providers/manual.provider';
import { WalletModule } from '../wallet/wallet.module';
import { PrismaModule } from '../prisma/prisma.module';

import { MinThresholdRule } from './rules/min-threshold.rule';
import { KycRule } from './rules/kyc.rule';
import { FraudRule } from './rules/fraud.rule';

import { PayoutExecutionService } from './payout-execution.service';
import { WebhookController } from './webhook.controller';

@Module({
    imports: [PrismaModule, WalletModule],
    controllers: [PayoutsController, WebhookController],
    providers: [
        PayoutsService,
        PrismaService,
        PayoutExecutionService,
        PaynowProvider,
        BankProvider,
        ManualProvider,
        MinThresholdRule,
        KycRule,
        FraudRule,
    ],
    exports: [PayoutsService]
})
export class PayoutsModule { }
