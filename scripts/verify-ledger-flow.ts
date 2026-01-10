
import { Test, TestingModule } from '@nestjs/testing';
import { WalletsModule } from '../apps/api/src/wallets/wallets.module';
import { PrismaModule } from '../apps/api/src/prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { WalletLedgerService } from '../apps/api/src/wallets/wallet-ledger.service';
import { PrismaService } from '../apps/api/src/prisma/prisma.service';
import { Currency, WalletLedgerSourceType, WalletLedgerType } from '@prisma/client';
import { Logger } from '@nestjs/common';

async function runVerification() {
    const logger = new Logger('LedgerVerification');
    logger.log('Starting Ledger Verification...');

    const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [
            ConfigModule.forRoot({ isGlobal: true }),
            PrismaModule,
            WalletsModule
        ],
    }).compile();

    const app = moduleFixture.createNestApplication();
    await app.init();

    const ledger = moduleFixture.get<WalletLedgerService>(WalletLedgerService);
    const prisma = moduleFixture.get<PrismaService>(PrismaService);

    // 1. Setup Test User
    const testUserEmail = `ledger-test-${Date.now()}@example.com`;
    let user = await prisma.user.create({
        data: {
            email: testUserEmail,
            role: 'USER',
            passwordHash: 'dummy',
            firstName: 'Ledger',
            lastName: 'Test',
        }
    });
    const userId = user.id;
    logger.log(`Created test user: ${userId}`);

    try {
        // 2. Initial Balance Should be 0
        let balance = await ledger.calculateBalance(userId, Currency.USD);
        console.log('Initial Balance:', balance);
        if (balance.balanceCents !== 0) throw new Error('Initial balance not 0');

        // 3. Credit (Reward)
        logger.log('--- Testing Credit (Reward) ---');
        await ledger.credit(userId, 5000, Currency.USD, WalletLedgerSourceType.REWARD_EARNED, 'test-reward-1', 'Test Reward');
        balance = await ledger.calculateBalance(userId, Currency.USD);
        console.log('After Credit 5000:', balance);
        if (balance.balanceCents !== 5000) throw new Error('Balance mismatch after credit');
        if (balance.withdrawableCents !== 5000) throw new Error('Withdrawable mismatch after credit');

        // 4. Hold (Payout Request)
        logger.log('--- Testing Hold (Payout Request) ---');
        await ledger.hold(userId, 2000, Currency.USD, WalletLedgerSourceType.PAYOUT, 'test-payout-1', 'Payout Hold');
        balance = await ledger.calculateBalance(userId, Currency.USD);
        console.log('After Hold 2000:', balance);
        // Total should be 5000, Pending should be 2000, Withdrawable should be 3000
        if (balance.balanceCents !== 5000) throw new Error('Total Balance should not change on Hold');
        if (balance.pendingCents !== 2000) throw new Error('Pending should be 2000');
        if (balance.withdrawableCents !== 3000) throw new Error('Withdrawable should be 3000');

        // 5. Release + Debit (Payout Success)
        logger.log('--- Testing Release + Debit (Payout Processed) ---');
        // Release
        await ledger.release(userId, 2000, Currency.USD, WalletLedgerSourceType.PAYOUT, 'test-payout-1', 'Payout Release');
        // Debit
        await ledger.debit(userId, 2000, Currency.USD, WalletLedgerSourceType.PAYOUT, 'test-payout-1', 'Payout Debit');

        balance = await ledger.calculateBalance(userId, Currency.USD);
        console.log('After Payout Success (Release+Debit):', balance);
        // Total should be 3000, Pending 0, Withdrawable 3000
        if (balance.balanceCents !== 3000) throw new Error(`Total Balance mismatch: ${balance.balanceCents}`);
        if (balance.pendingCents !== 0) throw new Error(`Pending mismatch: ${balance.pendingCents}`);
        if (balance.withdrawableCents !== 3000) throw new Error(`Withdrawable mismatch: ${balance.withdrawableCents}`);

        // 6. Ad Spend (Direct Debit)
        logger.log('--- Testing Ad Spend (Direct Debit) ---');
        await ledger.debit(userId, 500, Currency.USD, WalletLedgerSourceType.AD_SPEND, 'camp-1', 'Ad Click');
        balance = await ledger.calculateBalance(userId, Currency.USD);
        console.log('After Ad Spend 500:', balance);
        if (balance.balanceCents !== 2500) throw new Error('Balance mismatch after spend');

        // 7. Refund
        logger.log('--- Testing Refund ---');
        await ledger.refund(userId, 500, Currency.USD, WalletLedgerSourceType.AD_REFUND, 'camp-1', 'Ad Refund');
        balance = await ledger.calculateBalance(userId, Currency.USD);
        console.log('After Refund 500:', balance);
        if (balance.balanceCents !== 3000) throw new Error('Balance mismatch after refund');

        logger.log('✅ VERIFICATION SUCCESSFUL');

    } catch (e) {
        logger.error('Verification Failed', e);
        process.exit(1);
    } finally {
        // Cleanup
        await prisma.walletLedger.deleteMany({ where: { userId } });
        await prisma.user.delete({ where: { id: userId } });
        await app.close();
    }
}

runVerification();
