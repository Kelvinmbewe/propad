import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Currency, WalletLedgerType, WalletLedgerSourceType } from '@prisma/client';
import { format } from 'date-fns';

export interface LedgerSummaryParams {
    startDate: Date;
    endDate: Date;
    currency?: Currency;
}

@Injectable()
export class FinanceReportService {
    private readonly logger = new Logger(FinanceReportService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Generates a daily summary of ledger movements (Cashflow)
     * Grouped by Date, Type, and Source
     */
    async getLedgerSummary(params: LedgerSummaryParams) {
        const { startDate, endDate, currency = 'USD' } = params;

        // Prisma doesn't support complex date-grouping easily without raw queries or post-processing.
        // For strict types/safety, we'll fetch range and aggregate in memory (performance trade-off ok for now).
        // Or specific groupBy?
        // Let's use groupBy to get totals by Type/Source. Daily breakdown needs raw or post-proc.

        // Approach: Fetch all entries in range (if huge, we paginate/stream, but for reports typically strictly filtered).
        // Better: Aggregate by Type/Source for the whole period to show "Period Totals".
        // And maybe a daily chart data?

        // Let's provide "Daily Totals"
        const entries = await (this.prisma.walletLedger as any).findMany({
            where: {
                createdAt: { gte: startDate, lte: endDate },
                currency
            },
            select: {
                createdAt: true,
                type: true,
                sourceType: true,
                amountCents: true
            }
        });

        // Aggregate by Day
        const dailyMap = new Map<string, {
            date: string;
            credits: number;
            debits: number;
            netChange: number;
            breakdown: Record<string, number>;
        }>();

        for (const entry of entries) {
            const day = format(entry.createdAt, 'yyyy-MM-dd');
            if (!dailyMap.has(day)) {
                dailyMap.set(day, { date: day, credits: 0, debits: 0, netChange: 0, breakdown: {} });
            }
            const dayStat = dailyMap.get(day)!;

            if ([WalletLedgerType.CREDIT, WalletLedgerType.REFUND].includes(entry.type)) {
                dayStat.credits += entry.amountCents;
                dayStat.netChange += entry.amountCents;
            } else if ([WalletLedgerType.DEBIT].includes(entry.type)) {
                dayStat.debits += entry.amountCents;
                dayStat.netChange -= entry.amountCents;
            }

            // Breakdown by Source
            const key = `${entry.type}_${entry.sourceType}`;
            dayStat.breakdown[key] = (dayStat.breakdown[key] || 0) + entry.amountCents;
        }

        return Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    }

    /**
     * Generates a Revenue Report (Company Income)
     * Derived from sources that represent Platform Income:
     * - AD_SPEND (Advertiser pays platform)
     * - COMMISSION_EARNED (If platform takes cut? Or is this Agent income?)
     * - VERIFICATION (User pays platform)
     */
    async getRevenueReport(params: LedgerSummaryParams) {
        // Define what constitutes "Revenue"
        // 1. AD_SPEND (Debited from User -> Platform Revenue)
        // 2. VERIFICATION (Debited from User -> Platform Revenue)
        // Note: COMMISSION_EARNED is usually Agent income (Credit to Agent), so it's a LIABILITY for platform unless we track the fee portion?
        // Ideally we track "Platform Fees" separately.

        // For now, let's track "Platform Income Events" = DEBITS with specific sources.

        const revenueSources = [
            WalletLedgerSourceType.AD_SPEND,
            WalletLedgerSourceType.VERIFICATION,
            // Assuming we have a way to track platform fees
        ];

        const entries = await (this.prisma.walletLedger as any).findMany({
            where: {
                createdAt: { gte: params.startDate, lte: params.endDate },
                type: WalletLedgerType.DEBIT,
                sourceType: { in: revenueSources } // Filter sources
            }
        });

        // Group by Source
        const stats = entries.reduce((acc: Record<string, number>, entry: any) => {
            acc[entry.sourceType] = (acc[entry.sourceType] || 0) + entry.amountCents;
            acc.total += entry.amountCents;
            return acc;
        }, { total: 0 } as Record<string, number>);

        return stats;
    }

    /**
     * Get Current Outstanding Liabilities
     * (Total User Balances that platform owes users)
     */
    async getLiabilitiesSnapshot() {
        // Only sum balances for USER/AGENT/LANDLORD (Not internal/system accounts if any)
        // We can group by OwnerType.

        // We need to calculate balance for ALL users. Expensive?
        // Faster: Sum ALL credits - Sum ALL debits globally? 
        // Yes, if System is closed loop.

        const aggs = await (this.prisma.walletLedger as any).groupBy({
            by: ['type'],
            _sum: { amountCents: true }
        });

        let totalLiability = 0;
        aggs.forEach((a: any) => {
            if ([WalletLedgerType.CREDIT, WalletLedgerType.REFUND].includes(a.type)) {
                totalLiability += (a._sum.amountCents || 0);
            } else if (a.type === WalletLedgerType.DEBIT) {
                totalLiability -= (a._sum.amountCents || 0);
            }
        });

        // Outstanding Holds? (Funds locked but not yet debited). 
        // They are still part of Liability until Debited. 
        // So Total Equity = Liability.

        return {
            totalLiabilityCents: totalLiability,
            generatedAt: new Date()
        };
    }

    /**
     * Integrity Check
     * Finds users with negative balances or data anomalies
     */
    async checkIntegrity() {
        // 1. Find all users with transactions
        const users = await this.prisma.user.findMany({ select: { id: true, email: true } });
        const anomalies = [];

        for (const user of users) {
            // We reuse the WalletLedgerService logic effectively by querying raw
            const balance = await this.prisma.$queryRaw<{ balance: number }[]>`
                SELECT 
                  COALESCE(SUM(CASE WHEN type IN ('CREDIT', 'REFUND') THEN "amountCents" ELSE 0 END), 0) -
                  COALESCE(SUM(CASE WHEN type = 'DEBIT' THEN "amountCents" ELSE 0 END), 0) as balance
                FROM "WalletLedger"
                WHERE "userId" = ${user.id}
             `;

            const bal = Number(balance[0]?.balance || 0);
            if (bal < 0) {
                anomalies.push({ userId: user.id, email: user.email, issue: 'Negative Balance', balance: bal });
            }
        }

        return {
            valid: anomalies.length === 0,
            anomalies
        };
    }

    toCSV(data: any[]): string {
        if (!data.length) return '';
        const headers = Object.keys(data[0]).join(',');
        const rows = data.map(row => Object.values(row).map(v =>
            typeof v === 'string' ? `"${v}"` : v
        ).join(','));
        return [headers, ...rows].join('\n');
    }
}
