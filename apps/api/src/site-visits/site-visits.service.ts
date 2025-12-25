import { Injectable, BadRequestException, ForbiddenException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SiteVisitStatus, VerificationItemType, VerificationItemStatus, VerificationStatus, Role } from '@prisma/client';
import { TrustService } from '../trust/trust.service';
import { RiskService, RiskSignalType } from '../trust/risk.service';

@Injectable()
export class SiteVisitsService {
    private readonly logger = new Logger(SiteVisitsService.name);
    private readonly ASSIGNMENT_RADIUS_KM = 25; // 25km radius for auto-assignment
    private readonly GPS_THRESHOLD_KM = 5.0; // 5km threshold for approval

    constructor(
        private prisma: PrismaService,
        private trustService: TrustService,
        private riskService: RiskService
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
                status: SiteVisitStatus.PENDING_ASSIGNMENT
            }
        });

        // Auto-assign nearby officer
        try {
            await this.autoAssignNearbyOfficer(visit.id);
        } catch (error) {
            this.logger.error(`Failed to auto-assign officer for site visit ${visit.id}:`, error);
            // Continue - visit is created, can be manually assigned later
        }

        return visit;
    }

    /**
     * Auto-assigns the nearest officer within radius to a site visit.
     * Falls back to admin if none found.
     */
    async autoAssignNearbyOfficer(siteVisitId: string): Promise<void> {
        const visit = await this.prisma.siteVisit.findUnique({
            where: { id: siteVisitId },
            include: { property: true }
        });

        if (!visit) {
            throw new NotFoundException('Site visit not found');
        }

        if (visit.assignedModeratorId) {
            this.logger.log(`Site visit ${siteVisitId} already assigned to ${visit.assignedModeratorId}`);
            return;
        }

        const propertyLat = visit.property.lat;
        const propertyLng = visit.property.lng;

        if (!propertyLat || !propertyLng) {
            this.logger.warn(`Property ${visit.propertyId} has no GPS coordinates, falling back to admin assignment`);
            await this.assignToAdmin(siteVisitId);
            return;
        }

        // Query users with role ADMIN, MODERATOR, VERIFIER
        const eligibleOfficers = await this.prisma.user.findMany({
            where: {
                role: { in: [Role.ADMIN, Role.MODERATOR, Role.VERIFIER] },
                status: 'ACTIVE'
            },
            include: {
                agentProfile: true,
                landlordProfile: true
            }
        });

        // Find nearest officer within radius
        let nearestOfficer: { id: string; distance: number } | null = null;

        for (const officer of eligibleOfficers) {
            // Use property lat/lng from their profile or last known location
            // For now, we'll use a simple heuristic: check if they have properties in the same city
            // In a real system, you'd track lastKnownLat/lng or use a location service
            const officerLat = officer.agentProfile ? null : null; // Placeholder - would use lastKnownLat
            const officerLng = officer.agentProfile ? null : null; // Placeholder - would use lastKnownLng

            // If we have officer GPS, calculate distance
            if (officerLat && officerLng) {
                const distance = this.calculateDistance(propertyLat, propertyLng, officerLat, officerLng);
                if (distance <= this.ASSIGNMENT_RADIUS_KM) {
                    if (!nearestOfficer || distance < nearestOfficer.distance) {
                        nearestOfficer = { id: officer.id, distance };
                    }
                }
            }
        }

        // Assign to nearest officer or fallback to admin
        if (nearestOfficer) {
            await this.prisma.siteVisit.update({
                where: { id: siteVisitId },
                data: {
                    assignedModeratorId: nearestOfficer.id,
                    status: SiteVisitStatus.ASSIGNED
                }
            });
            this.logger.log(`Auto-assigned site visit ${siteVisitId} to officer ${nearestOfficer.id} (${nearestOfficer.distance.toFixed(2)}km away)`);
        } else {
            // Fallback to admin
            await this.assignToAdmin(siteVisitId);
        }
    }

    /**
     * Assigns site visit to the first available admin.
     */
    private async assignToAdmin(siteVisitId: string): Promise<void> {
        const admin = await this.prisma.user.findFirst({
            where: {
                role: Role.ADMIN,
                status: 'ACTIVE'
            }
        });

        if (admin) {
            await this.prisma.siteVisit.update({
                where: { id: siteVisitId },
                data: {
                    assignedModeratorId: admin.id,
                    status: SiteVisitStatus.ASSIGNED
                }
            });
            this.logger.log(`Assigned site visit ${siteVisitId} to admin ${admin.id} (fallback)`);
        } else {
            this.logger.warn(`No admin found to assign site visit ${siteVisitId}`);
        }
    }

    /**
     * Manual assignment fallback endpoint.
     * Roles: ADMIN only
     * Body: { officerId }
     * Ensure officer has role ADMIN | MODERATOR | VERIFIER
     * Persist assignedOfficerId
     * Reject reassignment if visit already COMPLETED
     */
    async assignModerator(visitId: string, moderatorId: string, assignerId: string) {
        // Validate visit
        const visit = await this.prisma.siteVisit.findUnique({ where: { id: visitId } });
        if (!visit) {
            throw new NotFoundException('Site visit not found');
        }

        // Reject reassignment if visit already COMPLETED
        if (visit.status === SiteVisitStatus.COMPLETED || visit.status === SiteVisitStatus.FAILED) {
            throw new BadRequestException('Cannot reassign a completed or failed visit');
        }

        // Validate moderator - Ensure officer has role ADMIN | MODERATOR | VERIFIER
        const moderator = await this.prisma.user.findUnique({
            where: { id: moderatorId },
            select: { id: true, role: true, status: true }
        });

        if (!moderator) {
            throw new NotFoundException('Officer not found');
        }

        if (![Role.ADMIN, Role.MODERATOR, Role.VERIFIER].includes(moderator.role)) {
            throw new BadRequestException('Officer must have role ADMIN, MODERATOR, or VERIFIER');
        }

        if (moderator.status !== 'ACTIVE') {
            throw new BadRequestException('Officer must be active');
        }

        // Update - Persist assignedOfficerId
        return this.prisma.siteVisit.update({
            where: { id: visitId },
            data: {
                assignedModeratorId: moderatorId,
                status: SiteVisitStatus.ASSIGNED
            }
        });
    }

    // ... implementation defaults for dashboard ...
    async getPendingVisits() {
        return this.prisma.siteVisit.findMany({
            where: { status: SiteVisitStatus.PENDING_ASSIGNMENT },
            include: {
                property: true,
                requestedBy: true,
                verificationItem: {
                    select: {
                        id: true,
                        type: true,
                        status: true
                    }
                }
            }
        });
    }

    async getModeratorVisits(moderatorId: string) {
        return this.prisma.siteVisit.findMany({
            where: {
                assignedModeratorId: moderatorId,
                status: { in: [SiteVisitStatus.ASSIGNED, SiteVisitStatus.IN_PROGRESS] }
            },
            include: {
                property: {
                    select: {
                        id: true,
                        title: true,
                        type: true,
                        lat: true,
                        lng: true,
                        suburb: true,
                        city: true
                    }
                },
                verificationItem: {
                    select: {
                        id: true,
                        type: true,
                        status: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    async getVisitById(visitId: string) {
        return this.prisma.siteVisit.findUnique({
            where: { id: visitId },
            include: {
                property: {
                    select: {
                        id: true,
                        title: true,
                        lat: true,
                        lng: true,
                        suburb: true,
                        city: true
                    }
                },
                requestedBy: true,
                assignedModerator: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true
                    }
                },
                verificationItem: {
                    include: {
                        verificationRequest: {
                            select: {
                                id: true,
                                status: true
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * Get eligible officers for assignment (ADMIN, MODERATOR, VERIFIER).
     */
    async getEligibleOfficers() {
        return this.prisma.user.findMany({
            where: {
                role: { in: [Role.ADMIN, Role.MODERATOR, Role.VERIFIER] },
                status: 'ACTIVE'
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true
            },
            orderBy: [
                { role: 'asc' }, // ADMIN first, then MODERATOR, then VERIFIER
                { name: 'asc' }
            ]
        });
    }
    /**
     * Completes a site visit with GPS validation.
     * Validates assignedOfficerId === req.user.id, saves officer GPS, computes distance,
     * and marks SiteVisit status = COMPLETED or FAILED.
     * Updates related VerificationRequestItem and trust scores.
     */
    async completeVisit(visitId: string, moderatorId: string, gpsLat: number, gpsLng: number, notes?: string) {
        // Validate assignedOfficerId === req.user.id
        const visit = await this.prisma.siteVisit.findUnique({
            where: { id: visitId },
            include: {
                verificationItem: {
                    include: {
                        verificationRequest: true
                    }
                },
                property: true
            }
        });

        if (!visit) {
            throw new NotFoundException('Site visit not found');
        }

        if (visit.assignedModeratorId !== moderatorId) {
            throw new ForbiddenException('Only assigned officer can complete this visit');
        }

        if (visit.status === SiteVisitStatus.COMPLETED || visit.status === SiteVisitStatus.FAILED) {
            throw new BadRequestException('Visit already completed');
        }

        const targetLat = visit.property.lat;
        const targetLng = visit.property.lng;

        if (!targetLat || !targetLng) {
            throw new BadRequestException('Property GPS coordinates are required for site visit validation');
        }

        // Compute distance from submitted GPS
        const distanceKm = this.calculateDistance(gpsLat, gpsLng, targetLat, targetLng);

        // Mark SiteVisit status = COMPLETED or FAILED based on distance threshold
        const isCloseEnough = distanceKm <= this.GPS_THRESHOLD_KM;
        const visitStatus = isCloseEnough ? SiteVisitStatus.COMPLETED : SiteVisitStatus.FAILED;

        // Save officer GPS and completedAt in a transaction
        return await this.prisma.$transaction(async (tx) => {
            const updatedVisit = await tx.siteVisit.update({
                where: { id: visitId },
                data: {
                    status: visitStatus,
                    visitGpsLat: gpsLat,
                    visitGpsLng: gpsLng,
                    distanceFromSubmittedGps: distanceKm,
                    notes: notes,
                    completedAt: new Date()
                }
            });

            // When SiteVisit COMPLETED: Update related VerificationRequestItem (Location Confirmation)
            if (visit.verificationItemId) {
                if (isCloseEnough) {
                    // If distance <= threshold → APPROVED
                    await tx.verificationRequestItem.update({
                        where: { id: visit.verificationItemId },
                        data: {
                            status: VerificationItemStatus.APPROVED,
                            notes: `Auto-approved by Site Visit (Distance: ${distanceKm.toFixed(2)}km)`,
                            verifierId: moderatorId,
                            reviewedAt: new Date()
                        }
                    });

                    // Boost Property Verification Score
                    const currentScore = visit.property.verificationScore || 0;
                    const newScore = Math.min(100, currentScore + 50); // Significant boost for physical verification

                    await tx.property.update({
                        where: { id: visit.propertyId },
                        data: { verificationScore: newScore }
                    });

                    // Recalculate parent VerificationRequest status
                    await this.recalculateVerificationRequestStatus(visit.verificationItem.verificationRequestId, tx);

                } else {
                    // Else → REJECTED + create RiskEvent
                    await tx.verificationRequestItem.update({
                        where: { id: visit.verificationItemId },
                        data: {
                            status: VerificationItemStatus.REJECTED,
                            notes: `Site visit failed: Distance ${distanceKm.toFixed(2)}km exceeds threshold (${this.GPS_THRESHOLD_KM}km). Moderator Notes: ${notes || 'None'}`,
                            verifierId: moderatorId,
                            reviewedAt: new Date()
                        }
                    });

                    // Create RiskEvent for GPS mismatch
                    await this.riskService.recordRiskEvent({
                        entityType: 'PROPERTY',
                        entityId: visit.propertyId,
                        signalType: RiskSignalType.GPS_MISMATCH,
                        scoreDelta: 15,
                        notes: `Site visit distance mismatch: ${distanceKm.toFixed(2)}km (threshold: ${this.GPS_THRESHOLD_KM}km)`
                    });

                    // Recalculate parent VerificationRequest status
                    await this.recalculateVerificationRequestStatus(visit.verificationItem.verificationRequestId, tx);
                }
            }

            // Restore site visit trust score: APPROVED site visit adds high trust weight
            if (isCloseEnough) {
                // Update Trust Intelligence summary immediately
                await this.trustService.calculatePropertyTrust(visit.propertyId);

                // Boost Owner Trust
                const ownerId = visit.property.landlordId || visit.property.agentOwnerId;
                if (ownerId) {
                    await this.trustService.calculateUserTrust(ownerId);
                }
            }

            return updatedVisit;
        });
    }

    /**
     * Recalculates VerificationRequest status based on item statuses.
     */
    private async recalculateVerificationRequestStatus(
        requestId: string,
        tx: any
    ): Promise<void> {
        const allItems = await tx.verificationRequestItem.findMany({
            where: { verificationRequestId: requestId }
        });

        const statusCounts = {
            APPROVED: allItems.filter((i: any) => i.status === VerificationItemStatus.APPROVED).length,
            REJECTED: allItems.filter((i: any) => i.status === VerificationItemStatus.REJECTED).length,
            SUBMITTED: allItems.filter((i: any) => i.status === VerificationItemStatus.SUBMITTED).length,
            PENDING: allItems.filter((i: any) => i.status === VerificationItemStatus.PENDING).length
        };

        let newRequestStatus: VerificationStatus;
        if (statusCounts.REJECTED > 0) {
            newRequestStatus = VerificationStatus.PENDING; // Request stays PENDING if any item is REJECTED
        } else if (statusCounts.APPROVED === allItems.length && allItems.length > 0) {
            newRequestStatus = VerificationStatus.APPROVED; // All items approved
        } else {
            newRequestStatus = VerificationStatus.PENDING; // Otherwise remains PENDING
        }

        await tx.verificationRequest.update({
            where: { id: requestId },
            data: { status: newRequestStatus }
        });
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
