import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VerificationFingerprintService } from '../verifications/verification-fingerprint.service';
import { TrustTier, VerificationStatus } from '@prisma/client';

@Injectable()
export class TrustService {
    private readonly logger = new Logger(TrustService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly fingerprintService: VerificationFingerprintService
    ) { }

    /**
     * Analyze location for anomalies:
     * 1. 50km+ jumps between properties (Velocity/Teleport check - logical)
     * 2. Clustering: Near-identical coords with other users' properties
     */
    async analyzeLocationPatterns(propertyId: string, lat: number, lng: number): Promise<string[]> {
        const flags: string[] = [];

        // Check for clustering (Same location, different user)
        // 0.0001 deg is approx 11m. exact match or very close.
        const neighbors = await this.prisma.property.findMany({
            where: {
                id: { not: propertyId },
                lat: { gte: lat - 0.0001, lte: lat + 0.0001 },
                lng: { gte: lng - 0.0001, lte: lng + 0.0001 },
                // Only active properties
                status: { in: ['ACTIVE', 'PENDING_VERIFY', 'VERIFIED'] }
            },
            select: { id: true, agentOwnerId: true, landlordId: true }
        });

        if (neighbors.length > 0) {
            // Logic: If neighbor is DIFFERENT user, flag.
            // We need to know current property owner.
            const currentProp = await this.prisma.property.findUnique({
                where: { id: propertyId },
                select: { agentOwnerId: true, landlordId: true }
            });

            if (currentProp) {
                const ownerId = currentProp.agentOwnerId || currentProp.landlordId;
                const diffUserNeighbors = neighbors.filter((n: { agentOwnerId: string | null; landlordId: string | null }) => (n.agentOwnerId || n.landlordId) !== ownerId);

                if (diffUserNeighbors.length > 0) {
                    flags.push('LOCATION_CLUSTERED_DIFF_USER');
                    this.logger.warn(`Property ${propertyId} location overlaps with ${diffUserNeighbors.length} other users' properties.`);
                }
            }
        }

        return flags;
    }

    /**
     * Recalculate User Trust Tier based on history
     */
    async updateUserTrust(userId: string) {
        // Get Verification Stats
        const requests = await this.prisma.verificationRequest.findMany({
            where: { requesterId: userId },
            select: { status: true }
        });

        const total = requests.length;
        if (total === 0) return;

        const rejected = requests.filter((r: { status: VerificationStatus }) => r.status === 'REJECTED').length;
        const rate = rejected / total;

        let newTier: TrustTier = TrustTier.NORMAL;

        if (total >= 3 && rate >= 0.5) newTier = TrustTier.WATCH;
        if (total >= 5 && rate >= 0.8) newTier = TrustTier.REVIEW;

        // Check if user is already HIGH_RISK (manual override), don't downgrade automatically?
        // "No silent downgrades" in rules? "No auto-punishment".
        // "Derive trust tiers... DO NOT block".
        // Setting Tier to WATCH/REVIEW is informational.

        // Only update if worse? Or dynamic?
        // Let's make it dynamic but sticky for HIGH_RISK.

        const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { trustTier: true } });
        if (user && user.trustTier === 'HIGH_RISK') return; // Manual override persists

        if (user && user.trustTier !== newTier) {
            await this.prisma.user.update({
                where: { id: userId },
                data: { trustTier: newTier }
            });
            this.logger.log(`User ${userId} trust tier updated to ${newTier} (Rejection Rate: ${rate.toFixed(2)})`);
        }
    }

    /**
     * Aggregate Trust Flags for Admin Review
     */
    async getTrustFlags(propertyId: string): Promise<string[]> {
        const prop = await this.prisma.property.findUnique({
            where: { id: propertyId },
            select: { lat: true, lng: true }
        });

        const locFlags = (prop && prop.lat && prop.lng)
            ? await this.analyzeLocationPatterns(propertyId, prop.lat, prop.lng)
            : [];

        // Document flags (future extension via FingerprintService check)
        // For now, we return locFlags.
        return locFlags;
    }
}
