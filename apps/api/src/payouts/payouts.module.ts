import { Module } from '@nestjs/common';
import { PayoutsService } from './payouts.service';
import { PayoutsController } from './payouts.controller';
import { PrismaService } from '../prisma/prisma.service';
import { PaynowProvider } from './providers/paynow.provider';
import { BankProvider } from './providers/bank.provider';
import { ManualProvider } from './providers/manual.provider';
import { WalletModule } from '../wallet/wallet.module';

@Module({
    imports: [WalletModule],
    controllers: [PayoutsController],
    providers: [
        PayoutsService,
        PrismaService,
        PaynowProvider,
        BankProvider,
        ManualProvider,
    ],
})
export class PayoutsModule { }
