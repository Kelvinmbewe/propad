import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { MailModule } from '../mail/mail.module';
import { WalletsController } from './wallets.controller';
import { WalletsService } from './wallets.service';
import { WalletLedgerService } from './wallet-ledger.service';
import { WalletController } from '../wallet/wallet.controller';
import { ConfigModule } from '@nestjs/config';
import { AdminLedgerController } from './admin-ledger.controller';

@Module({
  imports: [PrismaModule, AuditModule, MailModule, ConfigModule],
  controllers: [WalletsController, WalletController, AdminLedgerController],
  providers: [WalletsService, WalletLedgerService],
  exports: [WalletsService, WalletLedgerService]
})
export class WalletsModule { }
