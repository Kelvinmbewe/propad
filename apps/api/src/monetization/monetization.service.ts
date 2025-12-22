
import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { BoostType, Boost } from '@prisma/client';

@Injectable()
export class MonetizationService {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Calculates the adjusted price based on trust level.
     * Trust Level -> Multiplier
     * 0-39: x1.5 (Basic)
     * 40-59: x1.2 (Verified)
     * 60-79: x1.0 (Trusted)
     * 80-100: x0.8 (Elite)
     */
    calculatePrice(basePriceCents: number, trustScore: number): number {
        let multiplier = 1.0;

        if (trustScore < 40) {
            multiplier = 1.5;
        } else if (trustScore < 60) {
            multiplier = 1.2;
        } else if (trustScore < 80) {
            multiplier = 1.0;
        } else {
            multiplier = 0.8;
        }

        return Math.ceil(basePriceCents * multiplier);
    }

    /**
     * Helper to get the trust multiplier for display or calculation.
     */
    getTrustMultiplier(trustScore: number): number {
        if (trustScore < 40) return 1.5;
        if (trustScore < 60) return 1.2;
        if (trustScore < 80) return 1.0;
        return 0.8;
    }

    /**
     * Creates a boost for an entity.
     * Validates trust requirements.
     */
    async createBoost(data: {
        type: BoostType;
        entityType: 'PROPERTY' | 'USER' | 'AGENCY';
        entityId: string;
        durationDays: number;
        invoiceId?: string;
    }, actorTrustScore: number) {
        // 1. Validate Eligibility
        this.validateBoostEligibility(data.type, actorTrustScore);

        // 2. Calculate End Time
        const endTime = new Date();
        endTime.setDate(endTime.getDate() + data.durationDays);

        // 3. Create Boost record
        return this.prisma.boost.create({
            data: {
                type: data.type,
                entityType: data.entityType,
                entityId: data.entityId,
                endTime,
                invoiceId: data.invoiceId,
                isActive: true
            }
        });
    }

    /**
     * Validates if an entity is eligible for a boost type based on trust score.
     */
    validateBoostEligibility(type: BoostType, trustScore: number) {
        const requirements: Record<BoostType, number> = {
            LISTING_BOOST: 40,
            FEATURED_LISTING: 40,
            VERIFICATION_FAST_TRACK: 0, // SLA priority, any trust (monetization rules)
            PROFILE_BOOST: 50
        };

        const required = requirements[type];
        if (trustScore < required) {
            throw new ForbiddenException(`Trust score too low for ${type}. Required: ${required}, Current: ${trustScore}`);
        }
    }

    /**
     * Gets active boosts for an entity, filtered by risk score if provided.
     */
    async getActiveBoosts(entityType: string, entityId: string, riskScore?: number): Promise<Boost[]> {
        // Phase H: Boost suppression when riskScore >= 40
        if (riskScore !== undefined && riskScore >= 40) {
            return [];
        }

        return this.prisma.boost.findMany({
            where: {
                entityType: entityType.toUpperCase(),
                entityId,
                isActive: true,
                endTime: { gte: new Date() }
            }
        });
    }

    /**
     * Records a financial event in the ledger.
     */
    async recordLedgerEntry(data: {
        entityType: 'USER' | 'AGENCY' | 'PROPERTY';
        entityId: string;
        type: 'DEBIT' | 'CREDIT' | 'WRITE_OFF';
        amountUsdCents: number;
        description: string;
        metadata?: any;
    }) {
        return this.prisma.ledgerEntry.create({
            data: {
                entityType: data.entityType,
                entityId: data.entityId,
                type: data.type,
                amountUsdCents: data.amountUsdCents,
                description: data.description,
                metadata: data.metadata || {},
            }
        });
    }

    /**
     * Daily Cleanup: Deactivate expired boosts.
     */
    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async handleBoostExpiry() {
        const expired = await this.prisma.boost.updateMany({
            where: {
                isActive: true,
                endTime: { lt: new Date() }
            },
            data: { isActive: false }
        });

        return expired.count;
    }
}
