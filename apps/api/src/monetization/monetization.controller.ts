import { Controller, Get, Post, Body, UseGuards, Query, Param, Req } from '@nestjs/common';
import { MonetizationService } from './monetization.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role, BoostType } from '@prisma/client';

@Controller('monetization')
export class MonetizationController {
    constructor(private readonly monetizationService: MonetizationService) { }

    @Get('pricing')
    @UseGuards(JwtAuthGuard)
    async getPricing(
        @Query('type') type: BoostType,
        @Req() req: any
    ) {
        // ...
        const basePrice = 1000; // Mock base price
        const trustScore = 50; // Mock trust score for now as user info might be complex
        const finalPrice = this.monetizationService.calculatePrice(basePrice, trustScore);
        const multiplier = this.monetizationService.getTrustMultiplier(trustScore);

        return {
            type,
            basePriceCents: basePrice,
            finalPriceCents: finalPrice,
            multiplier,
            trustScore,
            tier: multiplier === 0.8 ? 'ELITE' : multiplier === 1.0 ? 'TRUSTED' : multiplier === 1.2 ? 'VERIFIED' : 'BASIC'
        };
    }

    @Post('admin/manual-boost')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    async grantManualBoost(
        @Body() body: {
            type: BoostType;
            entityType: 'PROPERTY' | 'USER' | 'AGENCY';
            entityId: string;
            durationDays: number;
            reason: string;
        },
        @Req() req: any
    ) {
        const boost = await this.monetizationService.createBoost({
            type: body.type,
            entityType: body.entityType,
            entityId: body.entityId,
            durationDays: body.durationDays
        }, 100); // Admins bypass trust requirements

        await this.monetizationService.recordLedgerEntry({
            entityType: body.entityType,
            entityId: body.entityId,
            type: 'CREDIT',
            amountUsdCents: 0,
            description: `Manual boost granted by admin ${req.user.userId}. Reason: ${body.reason}`,
            metadata: { adminId: req.user.userId, reason: body.reason, boostId: boost.id }
        });

        return boost;
    }

    @Get('admin/metrics')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN, Role.MODERATOR as any)
    async getMetrics() {
        // Simple ROI metrics mockup for now
        // Boost -> Engagement (Views/Offers) correlation
        return {
            activeBoosts: 0, // Count from DB
            totalRevenueCents: 0, // Sum from Ledger
            performance: {
                LISTING_BOOST: { avgViewIncrease: '25%', conversionLift: '12%' },
                FEATURED_LISTING: { avgViewIncrease: '150%', conversionLift: '40%' }
            }
        };
    }
}
