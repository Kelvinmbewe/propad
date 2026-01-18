import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WalletLedgerService } from '../wallets/wallet-ledger.service';
import { CommissionStatus, Currency, WalletLedgerSourceType } from '@prisma/client';
import { PricingBreakdown } from '../payments/pricing.service';

// Generic type for payment transaction since model may not exist
type PaymentTransactionLike = { id: string };

@Injectable()
export class CommissionsService {
    private readonly logger = new Logger(CommissionsService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly ledger: WalletLedgerService
    ) { }

    async distribute(transaction: PaymentTransactionLike, invoice: { id: string; currency: Currency; lines: any[] }) {
        this.logger.log(`Distributing commissions for transaction ${transaction.id}`);

        // Find lines with pricing breakdown
        for (const line of invoice.lines) {
            const meta = line.metaJson as { pricingBreakdown?: PricingBreakdown, featureId?: string, agentId?: string };
            if (!meta?.pricingBreakdown) continue;

            const breakdown = meta.pricingBreakdown;

            // 1. Agent Commission
            if (breakdown.agentShareCents && breakdown.agentShareCents > 0) {
                // Use injected agentId from metadata
                const agentId = meta.agentId;

                if (agentId) {
                    this.logger.log(`Creating commission for agent ${agentId}: ${breakdown.agentShareCents} ${invoice.currency}`);

                    // Create Commission Record
                    const commission = await this.prisma.commission.create({
                        data: {
                            agentId: agentId,
                            propertyId: meta.featureId || undefined,
                            transactionId: transaction.id,
                            amountCents: breakdown.agentShareCents,
                            currency: invoice.currency,
                            ratePercent: 0,
                            status: CommissionStatus.PAID,
                            paidAt: new Date()
                        }
                    });

                    // Credit Agent Wallet
                    await this.ledger.credit(
                        agentId,
                        breakdown.agentShareCents,
                        invoice.currency,
                        WalletLedgerSourceType.COMMISSION_EARNED,
                        commission.id,
                        'Agent Commission'
                    );

                    this.logger.log(`Credited agent ${agentId} with ${breakdown.agentShareCents} ${invoice.currency}`);
                } else {
                    this.logger.warn(`Agent share exists but no agentId found for transaction ${transaction.id}`);
                }
            }

            // 2. Platform Fee (Revenue)
            if (breakdown.platformFeeCents > 0) {
                // Future: Record Platform Revenue
            }

            // 3. Referral Commission
            if (breakdown.referralShareCents && breakdown.referralShareCents > 0) {
                // Future: Handle referral logic
            }
        }

        return true;
    }
}
