import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Application, DealStatus, PropertyStatus, NotificationType } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class DealsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly notificationsService: NotificationsService
    ) { }

    async createFromApplication(application: Application) {
        // 1. Validate
        const property = await this.prisma.property.findUnique({ where: { id: application.propertyId } });
        if (!property) throw new NotFoundException('Property not found');

        if (property.status === PropertyStatus.RENTED || property.status === PropertyStatus.SOLD) {
            throw new BadRequestException('Property is already rented or sold');
        }

        // 2. Resolve roles
        // Tenant is the applicant
        const tenantId = application.userId;
        // Landlord is property owner
        const landlordId = property.landlordId || property.agentOwnerId;
        if (!landlordId) throw new BadRequestException('Property has no owner');
        // Agent is whatever agent is assigned ?? Or the agent owner?
        // Let's assume if agentOwnerId is set, they are the agent. Or if property has an assignment?
        // For simplicity, if agentOwnerId exists, they are agent. If landlordId exists, check assignments.
        // NOTE: Schema has `agentId` on Deal as optional.
        // Let's check assignments.
        const assignments = await this.prisma.agentAssignment.findMany({
            where: { propertyId: property.id },
            orderBy: { createdAt: 'desc' },
            take: 1
        });
        const agentId = assignments.length > 0 ? assignments[0].agentId : (property.agentOwnerId || null);


        // 3. Create Deal
        return this.prisma.$transaction(async (tx) => {
            const deal = await tx.deal.create({
                data: {
                    propertyId: application.propertyId,
                    tenantId: tenantId,
                    landlordId: landlordId,
                    agentId: agentId,
                    applicationId: application.id,
                    status: DealStatus.ACTIVE,
                    startDate: new Date(), // Start immediately or from application details? defaulting to now
                    // Defaulting rent/deposit from Property price for now, ideally comes from Application negotiation
                    rentAmount: Number(property.price) * 100, // primitive assumption: price is rent
                    currency: property.currency,
                    // depositAmount: ... 
                }
            });

            // 4. Update Property Status
            await tx.property.update({
                where: { id: property.id },
                data: { status: PropertyStatus.OCCUPIED } // or RENTED. Schema has RENTED/SOLD/OCCUPIED. Let's use OCCUPIED for generic or RENTED for Rental.
                // Let's assume OCCUPIED covers both for now, or RENTED if type is rental.
                // Schema has RENTED.
            });

            // 5. Notify parties
            // Notify Tenant
            await this.notificationsService.notifyUser(
                tenantId,
                NotificationType.SYSTEM,
                'Lease Finalized',
                'Congratulations! Your application has been approved and the lease is now active.',
                `/dashboard/deals/${deal.id}`
            );

            return deal;
        });
    }

    async findMyDeals(userId: string) {
        return this.prisma.deal.findMany({
            where: {
                OR: [
                    { tenantId: userId },
                    { landlordId: userId },
                    { agentId: userId }
                ]
            },
            include: {
                property: true,
                tenant: { select: { id: true, name: true, email: true } },
                landlord: { select: { id: true, name: true, email: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    async findOne(id: string, userId: string) {
        const deal = await this.prisma.deal.findUnique({
            where: { id },
            include: {
                property: true,
                tenant: true,
                landlord: true,
                agent: true
            }
        });
        if (!deal) throw new NotFoundException('Deal not found');

        // Check access
        if (deal.tenantId !== userId && deal.landlordId !== userId && deal.agentId !== userId) {
            throw new NotFoundException('Deal not found'); // Hide access denied
        }

        return deal;
    }
}
