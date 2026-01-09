import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InterestsService {
    private readonly logger = new Logger(InterestsService.name);

    constructor(private readonly prisma: PrismaService) { }

    async toggleInterest(userId: string, propertyId: string) {
        // Check if interest exists
        const existing = await this.prisma.interest.findUnique({
            where: {
                propertyId_userId: {
                    propertyId,
                    userId,
                },
            },
        });

        if (existing) {
            // Remove it
            await this.prisma.interest.delete({
                where: {
                    propertyId_userId: {
                        propertyId,
                        userId,
                    },
                },
            });
            return { isSaved: false };
        } else {
            // Create it
            try {
                await this.prisma.interest.create({
                    data: {
                        propertyId,
                        userId,
                        status: 'PENDING', // Default status
                    },
                });
                return { isSaved: true };
            } catch (error) {
                // Handle foreign key constraint if property doesn't exist
                this.logger.error(`Failed to save property ${propertyId} for user ${userId}`, error);
                throw new BadRequestException('Could not save property');
            }
        }
    }

    async getMyInterests(userId: string) {
        return this.prisma.interest.findMany({
            where: {
                userId,
            },
            include: {
                property: {
                    include: {
                        media: {
                            take: 1
                        },
                        location: {
                            include: {
                                city: true,
                                suburb: true
                            }
                        }
                    }
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }
}
