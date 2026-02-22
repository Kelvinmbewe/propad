import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LedgerIntegrityService } from './ledger-integrity.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class LedgerIntegrityCron {
    private readonly logger = new Logger(LedgerIntegrityCron.name);

    constructor(
        private readonly integrityService: LedgerIntegrityService,
        private readonly auditService: AuditService
    ) { }

    /**
     * Run integrity checks daily at 3 AM
     */
    @Cron(CronExpression.EVERY_DAY_AT_3AM)
    async runDailyIntegrityCheck() {
        this.logger.log('Starting scheduled ledger integrity check...');

        try {
            const report = await this.integrityService.runAllChecks(false);

            // Log result to audit trail
            await this.auditService.logAction({
                action: 'LEDGER_INTEGRITY_CHECK',
                targetType: 'System',
                metadata: {
                    passed: report.passed,
                    violationCount: report.violations.length,
                    negativeBalanceCount: report.checks.negativeBalances.count,
                    orphanEntryCount: report.checks.orphanEntries.count,
                    unmappedSourceCount: report.checks.unmappedSources.count,
                },
            });

            if (!report.passed) {
                // In production, this would trigger alerts
                this.logger.error(
                    `Ledger integrity check FAILED with ${report.violations.length} violations`
                );

                // Log critical violations
                const criticalViolations = report.violations.filter(
                    (v) => v.severity === 'CRITICAL'
                );
                for (const violation of criticalViolations) {
                    this.logger.error(`CRITICAL: ${violation.details}`);
                }
            }
        } catch (error) {
            this.logger.error('Ledger integrity check failed with error:', error);
        }
    }
}
