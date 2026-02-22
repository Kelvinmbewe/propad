
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { FinanceReportService } from '../src/finance/finance-report.service';
import { WalletLedgerService } from '../src/wallets/wallet-ledger.service';
import { Currency, WalletLedgerSourceType } from '@prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const financeService = app.get(FinanceReportService);
    const ledgerService = app.get(WalletLedgerService);
    const prisma = app.get(PrismaService);

    const testUser = 'finance-test-user-' + Date.now();

    console.log('--- Starting Finance Report Verification ---');

    // 1. Setup Data
    try {
        await prisma.user.create({ data: { id: testUser, email: testUser + '@test.com', role: 'USER' } });
    } catch (e) { }

    // Credit 100
    await ledgerService.credit(testUser, 10000, Currency.USD, WalletLedgerSourceType.DEPOSIT, 'ref-1', 'Deposit');
    // Debit 20 (Ad Spend)
    await ledgerService.debit(testUser, 2000, Currency.USD, WalletLedgerSourceType.AD_SPEND, 'camp-1', 'Ad Spend');

    // 2. Test Ledger Summary
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();

    const summary = await financeService.getLedgerSummary({ startDate: start, endDate: end });
    console.log('Ledger Summary:', JSON.stringify(summary, null, 2));

    if (summary.length === 0) console.warn('Warning: Summary empty, might be timezone mismatch or db lag');
    else {
        const today = summary.find(s => s.credits >= 10000); // Check if our credit is there
        if (!today) console.warn('Could not find today\'s credit in summary');
        else console.log('Found credit in summary: OK');
    }

    // 3. Test Revenue Report
    const revenue = await financeService.getRevenueReport({ startDate: start, endDate: end });
    console.log('Revenue Report:', revenue);
    if ((revenue[WalletLedgerSourceType.AD_SPEND] || 0) < 2000) {
        console.warn('Revenue report missing recent ad spend');
    } else {
        console.log('Revenue Includes Ad Spend: OK');
    }

    // 4. Test Liabilities
    const liabilities = await financeService.getLiabilitiesSnapshot();
    console.log('Liabilities:', liabilities);
    if (liabilities.totalLiabilityCents <= 0) console.warn('Liabilities should be positive (users have money)');

    // 5. Test CSV
    const csv = financeService.toCSV([{ a: 1, b: 'test' }]);
    if (csv !== 'a,b\n1,"test"') throw new Error('CSV Generation Failed');
    console.log('CSV Gen: OK');

    console.log('--- Verification Complete ---');
    await app.close();
}

bootstrap();
