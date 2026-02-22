import { Module, forwardRef } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { WalletsModule } from '../wallets/wallets.module';

@Module({
    imports: [forwardRef(() => WalletsModule)],
    providers: [WalletService],
    exports: [WalletService],
})
export class WalletModule { }
