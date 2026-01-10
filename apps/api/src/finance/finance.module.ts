import { Module } from '@nestjs/common';
import { FinanceReportService } from './finance-report.service';
import { AdminReportsController } from './admin-reports.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { WalletModule } from '../wallet/wallet.module';

@Module({
    imports: [PrismaModule, WalletModule],
    controllers: [AdminReportsController],
    providers: [FinanceReportService],
    exports: [FinanceReportService]
})
export class FinanceModule { }
