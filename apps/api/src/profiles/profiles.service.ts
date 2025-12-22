
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BadgesHelper, TrustBadge } from '../trust/badges.helper';

@Injectable()
export class ProfilesService {
    constructor(
        private prisma: PrismaService,
        private badgesHelper: BadgesHelper
    ) { }

    async getPublicUserProfile(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                agentProfile: true,
                landlordProfile: true,
                siteVisitsAssigned: { where: { status: 'COMPLETED' } }, // For badge calc
                reviewsReceived: {
                    take: 5,
                    orderBy: { createdAt: 'desc' },
                    include: { reviewer: { select: { id: true, name: true, profilePhoto: true } } }
                }
            }
        });

        if (!user) throw new NotFoundException('User not found');

        // Safe DTO transformation
        const badges = this.badgesHelper.getUserBadges(user);

        // Hide sensitive risk data
        const safeReviewCount = user.reviewsReceived.length; // Approximate, or fetch count

        return {
            id: user.id,
            name: user.name,
            profilePhoto: user.profilePhoto,
            bio: user.bio,
            location: user.location,
            roles: [user.role], // Simplify to array
            stats: {
                joinedAt: user.createdAt,
                trustTier: this.mapTrustTierToPublic(user.trustScore),
                verificationLevel: user.isVerified ? 'VERIFIED' : 'UNVERIFIED',
                reviewCount: safeReviewCount, // Real app would use _count
            },
            badges,
            recentReviews: user.reviewsReceived.map(r => ({
                id: r.id,
                author: r.reviewer.name,
                rating: r.rating,
                comment: r.comment,
                date: r.createdAt
            }))
        };
    }

    async getPublicAgencyProfile(agencyId: string) {
        const agency = await this.prisma.agency.findUnique({
            where: { id: agencyId },
            include: {
                reviews: { take: 5, orderBy: { createdAt: 'desc' }, include: { reviewer: { select: { name: true } } } },
                members: { include: { user: { select: { id: true, name: true, profilePhoto: true } } } }
            }
        });

        if (!agency) throw new NotFoundException('Agency not found');

        const badges = this.badgesHelper.getAgencyBadges(agency);

        return {
            id: agency.id,
            name: agency.name,
            logo: agency.logoUrl,
            bio: agency.bio,
            stats: {
                agentCount: agency.members.length,
                trustTier: this.mapTrustTierToPublic(agency.trustScore),
                verified: agency.verificationScore > 0
            },
            badges,
            agents: agency.members.map(m => ({
                id: m.userId,
                name: m.user.name,
                photo: m.user.profilePhoto
            })),
            recentReviews: agency.reviews.map(r => ({
                rating: r.rating,
                comment: r.comment,
                author: r.reviewer.name,
                date: r.createdAt
            }))
        };
    }

    private mapTrustTierToPublic(score: number): string {
        if (score >= 90) return 'Elite';
        if (score >= 70) return 'Trusted';
        if (score >= 40) return 'Verified';
        return 'Standard';
    }
}
