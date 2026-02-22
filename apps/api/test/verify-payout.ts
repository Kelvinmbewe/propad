
import { NestFactory } from '@nestjs/core';
import { PayoutsModule } from '../src/payouts/payouts.module';
import { PayoutsService } from '../src/payouts/payouts.service';
import { WalletLedgerService } from '../src/wallets/wallet-ledger.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { PayoutMethod } from '@propad/config';
import { OwnerType, Currency, WalletLedgerSourceType } from '@prisma/client';
import { AppModule } from '../src/app.module';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const payoutsService = app.get(PayoutsService);
    const ledgerService = app.get(WalletLedgerService);
    const prisma = app.get(PrismaService);

    const userId = 'verify-payout-user-' + Date.now();
    const payoutAccountId = 'verify-account-' + Date.now();

    console.log('--- Starting Payout Flow Verification ---');

    // 0. Setup User and Account
    try {
        await prisma.user.create({
            data: { id: userId, email: userId + '@test.com', role: 'AGENT' }
        });
    } catch (e) { }

    // Create Payout Account
    await payoutsService.createPayoutAccount(OwnerType.USER, userId, 'BANK', 'My Test Bank', { bankName: 'Test Bank', accountNumber: '123' });
    const accounts = await payoutsService.getPayoutAccounts(OwnerType.USER, userId);
    const accountId = accounts[0].id;
    console.log('0. Setup: Created User and Payout Account', accountId);

    // 1. Credit Wallet (Add Funds)
    await ledgerService.credit(userId, 5000, Currency.USD, WalletLedgerSourceType.DEPOSIT, 'ref-1', 'Initial Deposit');
    console.log('1. Credited $50.00');

    // Check Balance
    let balance = await ledgerService.calculateBalance(userId, Currency.USD);
    console.log('   Balance:', balance);
    if (balance.withdrawableCents !== 5000) throw new Error('Balance mismatch after credit');

    // 2. Request Payout
    const request = await payoutsService.createPayoutRequest(OwnerType.USER, userId, 2000, PayoutMethod.BANK, accountId, Currency.USD);
    console.log('2. Requested $20.00 (Payout ID: ' + request.id + ')');

    // Check Balance
    balance = await ledgerService.calculateBalance(userId, Currency.USD);
    console.log('   Balance:', balance);
    if (balance.pendingCents !== 2000) throw new Error('Pending balance should be 2000');
    if (balance.withdrawableCents !== 3000) throw new Error('Withdrawable balance should be 3000');

    // 3. Approve Payout
    await payoutsService.approvePayout(request.id, 'admin-1');
    console.log('3. Approved Payout');

    // 4. Process Payout (Simulate Gateway)
    console.log('4. Processing Payout...');
    const processResult = await payoutsService.processPayout(request.id, 'gateway-ref-1', 'admin-1');

    const finalRequest = await prisma.payoutRequest.findUnique({ where: { id: request.id } });
    console.log('   Final Status:', finalRequest.status);

    // Check Balance
    balance = await ledgerService.calculateBalance(userId, Currency.USD);
    console.log('   Final Balance:', balance);

    if (finalRequest.status === 'PAID') {
        if (balance.balanceCents !== 3000) throw new Error('Total balance should have decreased to 3000');
        if (balance.pendingCents !== 0) throw new Error('Pending balance should be 0');
    } else {
        console.log('Payout not PAID, status:', finalRequest.status);
        // Throw error if expected PASS
    }

    console.log('--- Verification Complete ---');
    await app.close();
}

bootstrap();
