import { Module } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { LedgerService } from './ledger.service';

@Module({
    providers: [WalletService, LedgerService],
    exports: [WalletService, LedgerService],
})
export class WalletModule { }
