import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Currency, WalletLedgerType } from '@prisma/client';

export interface IntegrityViolation {
    type: 'NEGATIVE_BALANCE' | 'ORPHAN_ENTRY' | 'UNMAPPED_SOURCE';
    severity: 'WARNING' | 'ERROR' | 'CRITICAL';
    userId?: string;
    entryId?: string;
    details: string;
}

export interface IntegrityReport {
    timestamp: Date;
    passed: boolean;
    violations: IntegrityViolation[];
    checks: {
        negativeBalances: { passed: boolean; count: number };
        orphanEntries: { passed: boolean; count: number };
        unmappedSources: { passed: boolean; count: number };
    };
}

@Injectable()
export class LedgerIntegrityService {
    private readonly logger = new Logger(LedgerIntegrityService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Check for negative balances across all users
     */
    async checkNoNegativeBalances(): Promise<IntegrityViolation[]> {
        const violations: IntegrityViolation[] = [];

        // Aggregate balances per user/currency
        const balances = await this.prisma.$queryRaw<
            { userId: string; currency: string; balance: number }[]
        >`
      SELECT 
        "userId",
        "currency",
        SUM(
          CASE 
            WHEN type = 'CREDIT' OR type = 'REFUND' OR type = 'RELEASE' THEN "amountCents"
            WHEN type = 'DEBIT' OR type = 'HOLD' THEN -"amountCents"
            ELSE 0
          END
        ) as balance
      FROM "WalletLedger"
      GROUP BY "userId", "currency"
      HAVING SUM(
        CASE 
          WHEN type = 'CREDIT' OR type = 'REFUND' OR type = 'RELEASE' THEN "amountCents"
          WHEN type = 'DEBIT' OR type = 'HOLD' THEN -"amountCents"
          ELSE 0
        END
      ) < 0
    `;

        for (const row of balances) {
            violations.push({
                type: 'NEGATIVE_BALANCE',
                severity: 'CRITICAL',
                userId: row.userId,
                details: `User ${row.userId} has negative balance: ${row.balance} ${row.currency}`,
            });
        }

        return violations;
    }

    /**
     * Check for orphan ledger entries (entries without valid source)
     */
    async checkNoOrphanEntries(): Promise<IntegrityViolation[]> {
        const violations: IntegrityViolation[] = [];

        // Find entries with sourceId that don't reference valid records
        // Check RewardDistribution references
        const orphanRewards = await this.prisma.walletLedger.findMany({
            where: {
                sourceType: 'REWARD_EARNED',
                sourceId: { not: null },
                rewardDistributionId: null,
            },
            select: { id: true, userId: true, sourceId: true },
            take: 100,
        });

        for (const entry of orphanRewards) {
            // Verify the sourceId exists in RewardDistribution
            const exists = await this.prisma.rewardDistribution.findUnique({
                where: { id: entry.sourceId! },
            });

            if (!exists) {
                violations.push({
                    type: 'ORPHAN_ENTRY',
                    severity: 'ERROR',
                    userId: entry.userId,
                    entryId: entry.id,
                    details: `Ledger entry ${entry.id} references non-existent RewardDistribution ${entry.sourceId}`,
                });
            }
        }

        // Check Commission references
        const orphanCommissions = await this.prisma.walletLedger.findMany({
            where: {
                sourceType: 'COMMISSION_EARNED',
                sourceId: { not: null },
            },
            select: { id: true, userId: true, sourceId: true },
            take: 100,
        });

        for (const entry of orphanCommissions) {
            const exists = await this.prisma.commission.findUnique({
                where: { id: entry.sourceId! },
            });

            if (!exists) {
                violations.push({
                    type: 'ORPHAN_ENTRY',
                    severity: 'ERROR',
                    userId: entry.userId,
                    entryId: entry.id,
                    details: `Ledger entry ${entry.id} references non-existent Commission ${entry.sourceId}`,
                });
            }
        }

        return violations;
    }

    /**
     * Check that every reward/commission maps to a source event
     */
    async checkSourceMappings(): Promise<IntegrityViolation[]> {
        const violations: IntegrityViolation[] = [];

        // Find RewardDistributions without proper source tracking
        const unmappedRewards = await this.prisma.rewardDistribution.findMany({
            where: {
                sourceId: null,
                status: 'PROCESSED',
            },
            select: { id: true, userId: true, reason: true },
            take: 100,
        });

        for (const reward of unmappedRewards) {
            violations.push({
                type: 'UNMAPPED_SOURCE',
                severity: 'WARNING',
                userId: reward.userId,
                entryId: reward.id,
                details: `RewardDistribution ${reward.id} has no sourceId (reason: ${reward.reason})`,
            });
        }

        // Find Commissions without transaction reference
        const unmappedCommissions = await this.prisma.commission.findMany({
            where: {
                transactionId: null,
                status: 'PAID',
            },
            select: { id: true, agentId: true },
            take: 100,
        });

        for (const comm of unmappedCommissions) {
            violations.push({
                type: 'UNMAPPED_SOURCE',
                severity: 'WARNING',
                userId: comm.agentId,
                entryId: comm.id,
                details: `Commission ${comm.id} has no transactionId`,
            });
        }

        return violations;
    }

    /**
     * Run all integrity checks
     */
    async runAllChecks(failFast: boolean = false): Promise<IntegrityReport> {
        this.logger.log('Running ledger integrity checks...');

        const report: IntegrityReport = {
            timestamp: new Date(),
            passed: true,
            violations: [],
            checks: {
                negativeBalances: { passed: true, count: 0 },
                orphanEntries: { passed: true, count: 0 },
                unmappedSources: { passed: true, count: 0 },
            },
        };

        // Check 1: Negative balances
        const negativeViolations = await this.checkNoNegativeBalances();
        report.checks.negativeBalances.count = negativeViolations.length;
        if (negativeViolations.length > 0) {
            report.checks.negativeBalances.passed = false;
            report.passed = false;
            report.violations.push(...negativeViolations);

            if (failFast) {
                this.logger.error(`CRITICAL: ${negativeViolations.length} negative balance violations found!`);
                return report;
            }
        }

        // Check 2: Orphan entries
        const orphanViolations = await this.checkNoOrphanEntries();
        report.checks.orphanEntries.count = orphanViolations.length;
        if (orphanViolations.length > 0) {
            report.checks.orphanEntries.passed = false;
            report.passed = false;
            report.violations.push(...orphanViolations);

            if (failFast) {
                this.logger.error(`ERROR: ${orphanViolations.length} orphan entry violations found!`);
                return report;
            }
        }

        // Check 3: Unmapped sources
        const unmappedViolations = await this.checkSourceMappings();
        report.checks.unmappedSources.count = unmappedViolations.length;
        if (unmappedViolations.length > 0) {
            report.checks.unmappedSources.passed = false;
            // Don't fail overall for warnings
            report.violations.push(...unmappedViolations);
        }

        if (report.passed) {
            this.logger.log('All ledger integrity checks passed');
        } else {
            this.logger.warn(`Ledger integrity check failed with ${report.violations.length} violations`);
        }

        return report;
    }

    /**
     * Verify balance for a specific user (use before operations)
     */
    async verifyUserBalance(userId: string, currency: Currency = Currency.USD): Promise<boolean> {
        const result = await this.prisma.$queryRaw<{ balance: number }[]>`
      SELECT SUM(
        CASE 
          WHEN type = 'CREDIT' OR type = 'REFUND' OR type = 'RELEASE' THEN "amountCents"
          WHEN type = 'DEBIT' OR type = 'HOLD' THEN -"amountCents"
          ELSE 0
        END
      ) as balance
      FROM "WalletLedger"
      WHERE "userId" = ${userId} AND "currency" = ${currency}::"Currency"
    `;

        const balance = result[0]?.balance ?? 0;

        if (balance < 0) {
            this.logger.error(`CRITICAL: User ${userId} has negative balance: ${balance}`);
            return false;
        }

        return true;
    }
}
