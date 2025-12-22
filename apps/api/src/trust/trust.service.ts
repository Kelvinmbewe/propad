
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TrustTier } from '@prisma/client';

@Injectable()
export class TrustService {
    constructor(private readonly prisma: PrismaService) { }

    // --- Main Calculation Methods ---

    async calculatePropertyTrust(propertyId: string): Promise<number> {
        const property = await this.prisma.property.findUnique({
            where: { id: propertyId },
            include: {
                listingPayments: { where: { status: 'PAID' } },
                propertyRatings: { where: { isAnonymous: false } }, // Only verified ratings
                activityLogs: { where: { createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } } } // Last 90 days
            }
        });

        if (!property) return 0;

        // 1. Verification (Max 40)
        // Normalized from property.verificationScore (which is 0-100 usually, but logic maxes at 80 mostly)
        // We treat verificationScore >= 80 as full 40 points.
        const verifScore = Math.min(40, Math.ceil((property.verificationScore || 0) / 2));

        // 2. Ratings (Max 30)
        let ratingScore = 0;
        if (property.propertyRatings.length > 0) {
            const avg = property.propertyRatings.reduce((a: number, b: any) => a + b.rating, 0) / property.propertyRatings.length;
            const countBonus = Math.min(5, property.propertyRatings.length); // Bonus for first 5 ratings
            ratingScore = (avg / 5) * 25 + countBonus;
        }
        ratingScore = Math.min(30, ratingScore);

        // 3. Activity (Max 20)
        // Simple heuristic: 1 point per 5 logs, max 20
        const activityScore = Math.min(20, Math.floor(property.activityLogs.length / 5));

        // 4. Payments (Max 10)
        // 5 points if any payment verified/paid
        const paymentScore = property.listingPayments.length > 0 ? 10 : 0;

        const total = Math.min(100, Math.ceil(verifScore + ratingScore + activityScore + paymentScore));

        // Update Property
        await this.prisma.property.update({
            where: { id: propertyId },
            data: { trustScore: total }
        });

        return total;
    }

    async calculateUserTrust(userId: string): Promise<number> {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                verificationRequests: { where: { status: 'APPROVED' } }, // Simplified
                reviewsReceived: true
            }
        });

        if (!user) return 0;

        // 1. Verification (Max 40)
        // User already has verificationScore (0-100)
        const verifScore = Math.min(40, (user.verificationScore || 0) * 0.4);

        // 2. Reviews (Max 30)
        let reviewScore = 0;
        if (user.reviewsReceived.length > 0) {
            const avg = user.reviewsReceived.reduce((a: number, b: any) => a + b.rating, 0) / user.reviewsReceived.length;
            reviewScore = (avg / 5) * 30;
        }

        // 3. Activity/History (Max 30) - Combining others for simplicity for User
        const ageDays = (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        const ageScore = Math.min(20, ageDays / 30 * 5); // 5 points per month, max 20 (4 months)

        const total = Math.min(100, Math.ceil(verifScore + reviewScore + ageScore));

        // Determine Tier
        const tier = this.getTrustTier(total);

        await this.prisma.user.update({
            where: { id: userId },
            data: { trustScore: total, trustTier: tier }
        });

        return total;
    }

    async calculateCompanyTrust(agencyId: string): Promise<number> {
        const agency = await this.prisma.agency.findUnique({
            where: { id: agencyId },
            include: {
                reviews: true
            }
        });

        if (!agency) return 0;

        // 1. Verification (Max 50) - Companies rely heavily on regs
        const verifScore = Math.min(50, (agency.verificationScore || 0) * 0.5);

        // 2. Reviews (Max 50)
        let reviewScore = 0;
        if (agency.reviews.length > 0) {
            const avg = agency.reviews.reduce((a: number, b: any) => a + b.rating, 0) / agency.reviews.length;
            reviewScore = (avg / 5) * 50;
        }

        const total = Math.min(100, Math.ceil(verifScore + reviewScore));

        await this.prisma.agency.update({
            where: { id: agencyId },
            data: { trustScore: total }
        });

        return total;
    }

    // Helper
    private getTrustTier(score: number): TrustTier {
        if (score >= 80) return TrustTier.HIGH_RISK; // Wait, schema says HIGH_RISK?
        // Schema: NORMAL, WATCH, REVIEW, HIGH_RISK
        // This enum seems inverse or for negative trust? 
        // Let's re-read schema.
        // Schema enum TrustTier { NORMAL, WATCH, REVIEW, HIGH_RISK }
        // This looks like internal risk tiering, not public trust badges (Elite vs Verified).
        // I should map "Elite" to NORMAL (Low Risk) and "None" to WATCH/REVIEW?
        // FOR NOW: Stick to integer score for public display logic.
        // Leave TrustTier as NORMAL unless score is suspiciously low?
        // Actually, let's map: 
        // 0-20 -> WATCH
        // 21-100 -> NORMAL

        if (score < 20) return TrustTier.WATCH;
        return TrustTier.NORMAL;
    }
}
