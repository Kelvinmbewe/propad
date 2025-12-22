
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';

export enum RiskSignalType {
    BURST_LISTING = 'BURST_LISTING',
    GPS_MISMATCH = 'GPS_MISMATCH',
    REPEATED_REJECTION = 'REPEATED_REJECTION',
    REVIEW_SPAM = 'REVIEW_SPAM',
    ACCOUNT_CLUSTERING = 'ACCOUNT_CLUSTERING',
    FAILED_SITE_VISIT = 'FAILED_SITE_VISIT',
    SUSPICIOUS_PRICE_VOLATILITY = 'SUSPICIOUS_PRICE_VOLATILITY',
    MANUAL_ADMIN_FLAG = 'MANUAL_ADMIN_FLAG',
    REPEAT_OFFER_WITHDRAWAL = 'REPEAT_OFFER_WITHDRAWAL',
}

@Injectable()
export class RiskService {
    private readonly logger = new Logger(RiskService.name);

    constructor(private prisma: PrismaService) { }

    /**
     * Records an internal risk signal and updates the entity's riskScore.
     */
    async recordRiskEvent(data: {
        entityType: 'USER' | 'AGENCY' | 'PROPERTY';
        entityId: string;
        signalType: RiskSignalType;
        scoreDelta: number;
        notes?: string;
        resolvedBy?: string;
    }) {
        const { entityType, entityId, signalType, scoreDelta, notes, resolvedBy } = data;

        try {
            // 1. Log the event
            await this.prisma.riskEvent.create({
                data: {
                    entityType,
                    entityId,
                    signalType,
                    scoreDelta,
                    notes,
                    resolvedBy,
                },
            });

            // 2. Update the entity's riskScore
            let updatedScore = 0;
            if (entityType === 'USER') {
                const user = await this.prisma.user.update({
                    where: { id: entityId },
                    data: { riskScore: { increment: scoreDelta } },
                    select: { riskScore: true },
                });
                updatedScore = user.riskScore;
            } else if (entityType === 'AGENCY') {
                const agency = await this.prisma.agency.update({
                    where: { id: entityId },
                    data: { riskScore: { increment: scoreDelta } },
                    select: { riskScore: true },
                });
                updatedScore = agency.riskScore;
            } else if (entityType === 'PROPERTY') {
                const property = await this.prisma.property.update({
                    where: { id: entityId },
                    data: { riskScore: { increment: scoreDelta } },
                    select: { riskScore: true },
                });
                updatedScore = property.riskScore;
            }

            // 3. Clamp score between 0-100
            if (updatedScore < 0 || updatedScore > 100) {
                const clamped = Math.min(100, Math.max(0, updatedScore));
                if (entityType === 'USER') await this.prisma.user.update({ where: { id: entityId }, data: { riskScore: clamped } });
                else if (entityType === 'AGENCY') await this.prisma.agency.update({ where: { id: entityId }, data: { riskScore: clamped } });
                else if (entityType === 'PROPERTY') await this.prisma.property.update({ where: { id: entityId }, data: { riskScore: clamped } });
            }

            this.logger.log(`RiskEvent recorded for ${entityType} ${entityId}: ${signalType} (+${scoreDelta})`);
        } catch (error) {
            this.logger.error(`Failed to record RiskEvent for ${entityType} ${entityId}`, error);
        }
    }

    /**
     * Silent dampening penalty multiplier (1.0 = no penalty, 0.0 = completely hidden)
     * riskScore 0-20: No penalty (1.0)
     * riskScore 21-100: Linear dampening down to 0.0
     */
    getRiskPenaltyMultiplier(riskScore: number): number {
        if (riskScore <= 20) return 1.0;
        const penalty = (riskScore - 20) / 80;
        return Math.max(0, 1 - penalty);
    }

    /**
     * Daily Risk Decay logic.
     * Gradually reduces risk scores by 5 points every 24 hours.
     */
    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async handleRiskDecay() {
        this.logger.log('Starting risk score decay process...');

        try {
            await this.prisma.user.updateMany({
                where: { riskScore: { gt: 0 } },
                data: { riskScore: { decrement: 5 } }
            });

            await this.prisma.agency.updateMany({
                where: { riskScore: { gt: 0 } },
                data: { riskScore: { decrement: 5 } }
            });

            await this.prisma.property.updateMany({
                where: { riskScore: { gt: 0 } },
                data: { riskScore: { decrement: 5 } }
            });

            // Ensure floor at 0 (Prisma decrement doesn't auto-floor)
            await this.prisma.user.updateMany({ where: { riskScore: { lt: 0 } }, data: { riskScore: 0 } });
            await this.prisma.agency.updateMany({ where: { riskScore: { lt: 0 } }, data: { riskScore: 0 } });
            await this.prisma.property.updateMany({ where: { riskScore: { lt: 0 } }, data: { riskScore: 0 } });

            this.logger.log('Risk score decay process completed.');
        } catch (error) {
            this.logger.error('Risk decay process failed', error);
        }
    }
}
