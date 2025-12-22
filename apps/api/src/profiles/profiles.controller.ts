
import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AgenciesService } from '../agencies/agencies.service';

@Controller('profiles')
export class ProfilesController {
    constructor(
        private readonly prisma: PrismaService,
        private readonly agenciesService: AgenciesService
    ) { }

    @Get('users/:id')
    async getUserProfile(@Param('id') id: string) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                profilePhoto: true,
                bio: true,
                // role: true, // Primary Role
                roles: {
                    where: { revokedAt: null },
                    select: { role: true }
                },
                verificationScore: true,
                isVerified: true,
                trustScore: true,
                trustTier: true,
                createdAt: true,
                // Listings summary could be added here or strictly separate
                _count: {
                    select: {
                        propertiesOwned: { where: { status: 'VERIFIED' } },
                        listingActivitiesCreated: true
                    }
                }
            },
        });

        if (!user) throw new NotFoundException('User not found');
        return user;
    }

    @Get('companies/:slug')
    async getCompanyProfile(@Param('slug') slug: string) {
        // Re-use AgenciesService for consistency
        const agency = await this.agenciesService.findBySlug(slug);

        // Transform or sanitize if needed (Service returns full object currently)
        // For public profile, we might want to filter out sensitive info (e.g. emails of members)
        // The service currently selects minimal user info for members, which is good.
        return agency;
    }
}
