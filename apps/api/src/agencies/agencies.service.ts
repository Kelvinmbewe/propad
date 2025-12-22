
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AgencyStatus } from '@prisma/client';

import { TrustService } from '../trust/trust.service';

@Injectable()
export class AgenciesService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly trust: TrustService
    ) { }

    async findOne(id: string) {
        const agency = await this.prisma.agency.findUnique({
            where: { id },
            include: {
                members: { include: { user: { select: { id: true, name: true, profilePhoto: true, role: true } } } },
                reviews: { include: { reviewer: { select: { id: true, name: true } } } },
            },
        });

        if (!agency) {
            throw new NotFoundException('Company not found');
        }

        return agency;
    }

    async findBySlug(slug: string) {
        const agency = await this.prisma.agency.findUnique({
            where: { slug },
            include: {
                members: { include: { user: { select: { id: true, name: true, profilePhoto: true, role: true } } } },
                reviews: { include: { reviewer: { select: { id: true, name: true } } } },
            },
        });

        if (!agency) {
            throw new NotFoundException('Company not found');
        }

        return agency;
    }

    async updateProfile(id: string, data: { bio?: string; registrationNumber?: string; logoUrl?: string; slug?: string }) {
        await this.findOne(id); // Ensure exists

        return this.prisma.agency.update({
            where: { id },
            data,
        });
    }

    async updateTrustScore(id: string, scoreDelta: number) {
        const agency = await this.prisma.agency.findUnique({ where: { id } });
        if (!agency) return;

        const newScore = Math.max(0, agency.trustScore + scoreDelta);
        let verifiedAt = agency.verifiedAt;

        // Auto-verify if score is high enough? Or keep manual?
        // Keeping it simple: Trust score is derived. Verification is explicit.

        return this.prisma.agency.update({
            where: { id },
            data: { trustScore: newScore }
        });
    }

    async addReview(agencyId: string, reviewerId: string, rating: number, comment?: string) {
        const review = await this.prisma.agencyReview.create({
            data: {
                agencyId,
                reviewerId,
                rating,
                comment
            }
        });

        // Update aggregate rating? 
        // Agency model doesn't have `rating` field yet (only `trustScore`).
        // Could verify if we added `rating` to Agency? I don't think so, based on previous steps.
        // So we just store reviews for now.

        // Recalculate Trust
        await this.trust.calculateCompanyTrust(agencyId);

        return review;
    }
}
