import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WalletLedgerService } from '../../wallets/wallet-ledger.service';
import { WalletService } from '../../wallet/wallet.service';
import { Currency, OwnerType } from '@prisma/client';
import { WalletLedgerType, WalletLedgerSourceType } from '../../wallet/enums';

@Injectable()
export class DistributionEngine {
    private readonly logger = new Logger(DistributionEngine.name);

    constructor(
        private prisma: PrismaService,
        private ledger: WalletLedgerService,
        private wallet: WalletService,
    ) { }

    async distributePool(poolId: string) {
        const pool = await this.prisma.rewardPool.findUnique({
            where: { id: poolId, isActive: true },
        });

        if (!pool || pool.totalUsdCents <= pool.spentUsdCents) {
            this.logger.warn(`Pool ${poolId} is exhausted or inactive`);
            return;
        }

        // Logic for distribution would go here
        // For now, it's a placeholder for the cron job to call
        this.logger.log(`Processing distribution for pool: ${pool.name}`);
    }

    async awardPoints(userId: string, points: number, usdCents: number, reason: string, refId?: string) {
        return this.prisma.$transaction(async (tx) => {
            // 1. Create RewardEvent
            const event = await tx.rewardEvent.create({
                data: {
                    agentId: userId,
                    points,
                    usdCents,
                    type: 'BONUS_TIER', // Default for engine distribution
                    refId,
                },
            });

            // 2. Get/Create Wallet
            const wallet = await this.wallet.getOrCreateWallet(userId, OwnerType.USER, Currency.USD);

            // 3. Record Ledger entry
            await this.ledger.recordTransaction(
                userId,
                usdCents,
                WalletLedgerType.CREDIT,
                WalletLedgerSourceType.REWARD,
                event.id,
                Currency.USD,
                wallet.id,
            );

            return event;
        });
    }

    async ingestRevenue(date: Date, amountUsdCents: bigint) {
        this.logger.log(`Ingesting revenue for ${date.toISOString()}: ${amountUsdCents} cents`);

        // Find or Create Daily Pool
        // For simplicity, we assume one global pool for now, or distribute to active pools.
        // Let's create a "Daily Ad Revenue" pool record or add to existing.

        const poolName = `Ads-${date.toISOString().split('T')[0]}`;

        // Check if pool exists
        let pool = await this.prisma.rewardPool.findFirst({
            where: { name: poolName },
        });

        if (!pool) {
            pool = await this.prisma.rewardPool.create({
                data: {
                    name: poolName,
                    totalUsdCents: Number(amountUsdCents),
                    remainingUsdCents: Number(amountUsdCents), // Initial
                    spentUsdCents: 0,
                    isActive: true,
                    startDate: date,
                    endDate: new Date(date.getTime() + 24 * 60 * 60 * 1000), // 1 day validity
                },
            });
        } else {
            // Update logic if needed
        }

        return pool;
    }
}
