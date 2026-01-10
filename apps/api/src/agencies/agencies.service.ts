import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AgencyStatus, Role, AgencyMemberRole } from '@propad/config';
import { AuditService } from '../audit/audit.service';
import { TrustService } from '../trust/trust.service';

@Injectable()
export class AgenciesService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly trust: TrustService,
        private readonly audit: AuditService
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

    async create(name: string, userId: string) {
        const agency = await this.prisma.agency.create({
            data: {
                name,
                status: AgencyStatus.PENDING,
                members: {
                    create: {
                        userId,
                        role: AgencyMemberRole.OWNER
                    }
                }
            }
        });

        // Also update User role potentially? Or Trust score.
        await this.audit.logAction({
            action: 'AGENCY_CREATE',
            actorId: userId,
            targetType: 'agency',
            targetId: userId,
            metadata: { agencyId: agency.id, name }
        });
        return agency;
    }


    async updateProfile(id: string, data: { bio?: string; registrationNumber?: string; logoUrl?: string; slug?: string; name?: string }, userId: string) {
        const agency = await this.findOne(id);

        await this.audit.logAction({
            action: 'AGENCY_UPDATE',
            actorId: userId,
            targetType: 'agency',
            targetId: id,
            metadata: { before: agency, changes: data }
        });

        return this.prisma.agency.update({
            where: { id },
            data,
        });
    }

    async updateStatus(id: string, status: AgencyStatus, adminId: string) {
        const agency = await this.findOne(id);
        if (agency.status === status) return agency;

        await this.prisma.agency.update({
            where: { id },
            data: { status }
        });

        await this.audit.logAction({
            action: 'AGENCY_STATUS_CHANGE',
            actorId: adminId,
            targetType: 'agency',
            targetId: id,
            metadata: { from: agency.status, to: status }
        });

        // If ACTIVATED, maybe send notification
        return this.findOne(id);
    }

    async getMyAgency(userId: string) {
        // Find agency where user is a member
        const member = await this.prisma.agencyMember.findFirst({
            where: { userId },
            include: { agency: true }
        });

        return member?.agency || null;
    }

    async updateTrustScore(id: string, scoreDelta: number) {
        const agency = await this.prisma.agency.findUnique({ where: { id } });
        if (!agency) return;

        const newScore = Math.max(0, agency.trustScore + scoreDelta);
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

        await this.trust.calculateCompanyTrust(agencyId);
        return review;
    }
}
