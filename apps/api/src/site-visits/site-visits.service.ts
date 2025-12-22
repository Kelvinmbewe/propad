import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // Adjust path if needed
import { SiteVisitStatus, VerificationItemType, VerificationItemStatus, VerificationStatus } from '@prisma/client';
import { TrustService } from '../trust/trust.service';

@Injectable()
export class SiteVisitsService {
    constructor(
        private prisma: PrismaService,
        private trustService: TrustService
    ) { }

    /**
     * Request a site visit for a property.
     * Creates a SiteVisit record and ensures a pending VerificationRequestItem exists.
     */
    async requestVisit(userId: string, propertyId: string) {
        const property = await this.prisma.property.findUnique({ where: { id: propertyId } });
        if (!property) throw new NotFoundException('Property not found');
        if (property.landlordId !== userId && property.agentOwnerId !== userId) {
            // Simple check, real app might use CASL
            throw new ForbiddenException('Not owner of property');
        }

        // Check if active visit exists
        const existing = await this.prisma.siteVisit.findFirst({
            where: {
                propertyId,
                status: { in: ['PENDING_ASSIGNMENT', 'ASSIGNED', 'IN_PROGRESS'] }
            }
        });

        if (existing) {
            throw new BadRequestException('Active site visit request already exists');
        }

        // Ensure there is a VerificationRequest (Property level)
        let verifRequest = await this.prisma.verificationRequest.findFirst({
            where: { targetId: propertyId, targetType: 'PROPERTY', status: 'PENDING' }
        });

        if (!verifRequest) {
            verifRequest = await this.prisma.verificationRequest.create({
                data: {
                    targetId: propertyId,
                    targetType: 'PROPERTY',
                    status: 'PENDING',
                    requesterId: userId,
                    propertyId: propertyId
                }
            });
        }

        // Ensure VerificationRequestItem for Location exists
        let item = await this.prisma.verificationRequestItem.findFirst({
            where: {
                verificationRequestId: verifRequest.id,
                type: 'LOCATION_CONFIRMATION'
            }
        });

        if (!item) {
            item = await this.prisma.verificationRequestItem.create({
                data: {
                    verificationRequestId: verifRequest.id,
                    type: 'LOCATION_CONFIRMATION',
                    status: 'PENDING'
                }
            });
        }

        // Create Site Visit
        const visit = await this.prisma.siteVisit.create({
            data: {
                propertyId,
                requestedByUserId: userId,
                verificationItemId: item.id,
                status: 'PENDING_ASSIGNMENT'
            }
        });

        return visit;
    }

    async assignModerator(visitId: string, moderatorId: string, assignerId: string) {
        // Validate visit
        const visit = await this.prisma.siteVisit.findUnique({ where: { id: visitId } });
        if (!visit) throw new NotFoundException('Site visit not found');

        // Validate moderator (Check role, trusted, etc - for now just check existence)
        const moderator = await this.prisma.user.findUnique({ where: { id: moderatorId } });
        if (!moderator) throw new NotFoundException('Moderator not found');

        // Update
        return this.prisma.siteVisit.update({
            where: { id: visitId },
            data: {
                assignedModeratorId: moderatorId,
                status: 'ASSIGNED'
            }
        });
    }

    // ... implementation defaults for dashboard ...
    async getPendingVisits() {
        return this.prisma.siteVisit.findMany({
            where: { status: 'PENDING_ASSIGNMENT' },
            include: { property: true, requestedBy: true }
        });
    }

    async getModeratorVisits(moderatorId: string) {
        return this.prisma.siteVisit.findMany({
            where: { assignedModeratorId: moderatorId },
            include: { property: { select: { title: true, type: true, suburb: true, city: true } } }
        });
    }
    async completeVisit(visitId: string, moderatorId: string, lat: number, lng: number, notes?: string) {
        const visit = await this.prisma.siteVisit.findUnique({
            where: { id: visitId },
            include: { verificationItem: true, property: true }
        });

        if (!visit) throw new NotFoundException('Site visit not found');
        if (visit.assignedModeratorId !== moderatorId) throw new ForbiddenException('Not assigned to this visit');
        if (visit.status === 'COMPLETED') throw new BadRequestException('Visit already completed');

        const targetLat = visit.property.lat;
        const targetLng = visit.property.lng;

        let distanceKm = 0;
        if (targetLat && targetLng) {
            distanceKm = this.calculateDistance(lat, lng, targetLat, targetLng);
        }

        const isCloseEnough = distanceKm <= 5.0;

        const updatedVisit = await this.prisma.siteVisit.update({
            where: { id: visitId },
            data: {
                status: 'COMPLETED',
                visitGpsLat: lat,
                visitGpsLng: lng,
                distanceFromSubmittedGps: distanceKm,
                notes: notes,
                completedAt: new Date()
            }
        });

        if (visit.verificationItemId) {
            if (isCloseEnough) {
                await this.prisma.verificationRequestItem.update({
                    where: { id: visit.verificationItemId },
                    data: {
                        status: 'VERIFIED',
                        notes: `Auto-verified by Site Visit (Distance: ${distanceKm.toFixed(2)}km)`,
                        verifierId: moderatorId,
                        reviewedAt: new Date(),
                    }
                });

                // Boost Property Verification Score
                const currentScore = visit.property.verificationScore || 0;
                const newScore = Math.min(100, currentScore + 50); // Significant boost linked to physical verification

                await this.prisma.property.update({
                    where: { id: visit.propertyId },
                    data: { verificationScore: newScore }
                });

                // Recalculate Trust Scores
                await this.trustService.calculatePropertyTrust(visit.propertyId);

                // Boost Owner Trust
                const ownerId = visit.property.landlordId || visit.property.agentOwnerId;
                if (ownerId) {
                    await this.trustService.calculateUserTrust(ownerId);
                }

            } else {
                await this.prisma.verificationRequestItem.update({
                    where: { id: visit.verificationItemId },
                    data: {
                        status: 'PENDING', // Keep pending but Flag
                        notes: `SITE VISIT MISMATCH: Distance ${distanceKm.toFixed(2)}km. Moderator Notes: ${notes}`
                    }
                });
            }
        }

        return updatedVisit;
    }

    private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const R = 6371;
        const dLat = this.deg2rad(lat2 - lat1);
        const dLon = this.deg2rad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const d = R * c;
        return d;
    }

    private deg2rad(deg: number): number {
        return deg * (Math.PI / 180);
    }
}
