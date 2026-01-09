import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReconciliationService {
    private readonly logger = new Logger(ReconciliationService.name);

    constructor(private readonly prisma: PrismaService) { }

    async reconcileWallets() {
        this.logger.log('Starting Wallet Reconciliation');

        // 1. Get all users with wallet activity
        const users = await this.prisma.user.findMany({
            where: {
                walletLedgerEntries: { some: {} }
            },
            select: { id: true }
        });

        const results = {
            scanned: users.length,
            mismatches: 0,
            fixed: 0,
            details: [] as any[]
        };

        for (const user of users) {
            // Calculate theoretical balance from Ledger (Credit - Debit)
            const creditSum = await this.prisma.walletLedger.aggregate({
                where: { userId: user.id, type: 'CREDIT' },
                _sum: { amountCents: true }
            });
            const debitSum = await this.prisma.walletLedger.aggregate({
                where: { userId: user.id, type: 'DEBIT' },
                _sum: { amountCents: true }
            });

            const calculatedBalance = (creditSum._sum.amountCents || 0) - (debitSum._sum.amountCents || 0);

            // Get actual Wallet state
            const wallet = await this.prisma.wallet.findFirst({
                where: { ownerId: user.id, ownerType: 'USER' }
            });

            if (wallet) {
                if (wallet.balanceCents !== calculatedBalance) {
                    results.mismatches++;
                    results.details.push({
                        userId: user.id,
                        walletId: wallet.id,
                        current: wallet.balanceCents,
                        calculated: calculatedBalance,
                        diff: calculatedBalance - wallet.balanceCents
                    });

                    // Fix it
                    await this.prisma.wallet.update({
                        where: { id: wallet.id },
                        data: { balanceCents: calculatedBalance }
                    });
                    results.fixed++;
                }
            }
        }

        this.logger.log(`Reconciliation Complete: ${JSON.stringify(results)}`);
        return results;
    }
}
