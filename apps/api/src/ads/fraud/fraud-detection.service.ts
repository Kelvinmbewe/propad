import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
// import { FraudSeverity, FraudReason } from '@prisma/client'; // Fix: Use local definitions

// Local type definitions to bypass build issues if prisma client types are missing
export type FraudSeverity = 'LOW' | 'MEDIUM' | 'HIGH';
export type FraudReason = 'RAPID_CLICK' | 'SELF_CLICK' | 'BOT_BEHAVIOR' | 'GEO_MISMATCH' | 'AGENT_CONFLICT' | 'KNOWN_BAD_IP';

export interface FraudResult {
    isFraud: boolean;
    severity: FraudSeverity;
    reason?: FraudReason;
    score: number; // 0-100
    metadata?: Record<string, any>;
}

@Injectable()
export class FraudDetectionService {
    private readonly logger = new Logger(FraudDetectionService.name);

    constructor(private prisma: PrismaService) { }

    /**
     * Evaluate a click event for fraud.
     * returning HIGH severity block the click.
     */
    async evaluateClick(context: {
        ipAddress?: string;
        userAgent?: string;
        fingerprint?: string;
        campaignId: string;
        advertiserId: string;
        userId?: string; // Logged in user
    }): Promise<FraudResult> {
        const { ipAddress, userId, advertiserId, campaignId } = context;

        // RULE 1: Self-Click (Advertiser clicking own ad)
        if (userId) {
            const advertiser = await this.prisma.advertiser.findUnique({
                where: { id: advertiserId },
                select: { ownerId: true }
            });
            if (advertiser && advertiser.ownerId === userId) {
                return {
                    isFraud: true,
                    severity: 'HIGH',
                    reason: 'SELF_CLICK',
                    score: 100,
                    metadata: { rule: 'Owner clicked own ad' }
                };
            }
        }

        // RULE 2: Rapid Click (Same IP clicking same campaign multiple times in short window)
        if (ipAddress) {
            const recentClicks = await this.prisma.adClick.count({
                where: {
                    campaignId,
                    ipAddress,
                    createdAt: {
                        gte: new Date(Date.now() - 60 * 1000) // Last 1 minute
                    }
                }
            });

            if (recentClicks > 5) {
                return {
                    isFraud: true,
                    severity: 'HIGH',
                    reason: 'RAPID_CLICK',
                    score: 90,
                    metadata: { recentClicks, window: '60s' }
                };
            }
        }

        // RULE 3: Bot Heuristics (User Agent)
        if (context.userAgent) {
            const ua = context.userAgent.toLowerCase();
            if (ua.includes('bot') || ua.includes('crawler') || ua.includes('spider')) {
                return {
                    isFraud: true,
                    severity: 'MEDIUM', // Maybe legitimate crawler, but shouldn't charge
                    reason: 'BOT_BEHAVIOR',
                    score: 80,
                    metadata: { ua: context.userAgent }
                };
            }
        }

        return { isFraud: false, severity: 'LOW', score: 0 };
    }

    /**
     * Log a fraud event to the database.
     */
    async logFraudEvent(data: {
        campaignId: string;
        advertiserId: string;
        severity: FraudSeverity;
        reason: FraudReason;
        score: number;
        ipAddress?: string;
        userAgent?: string;
        metadata?: any;
    }) {
        // Only log if severity is MEDIUM or HIGH, or if we want to track specific LOW patterns
        if (data.severity === 'LOW') return;

        await this.prisma.fraudEvent.create({
            data: {
                campaignId: data.campaignId,
                advertiserId: data.advertiserId,
                severity: data.severity as any, // Cast to Prisma enum type
                reason: data.reason as any,
                score: data.score,
                ipAddress: data.ipAddress,
                userAgent: data.userAgent,
                metadata: data.metadata ?? {},
            }
        });

        this.logger.warn(`Fraud detected: [${data.reason}] ${data.severity} Score:${data.score} Campaign:${data.campaignId}`);
    }
}
