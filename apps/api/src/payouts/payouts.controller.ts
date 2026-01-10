import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PayoutsService } from './payouts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role, PayoutMethod } from '@propad/config';
import { OwnerType, Currency } from '@prisma/client';

@Controller('payouts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PayoutsController {
    constructor(
        private readonly payoutsService: PayoutsService
    ) { }

    @Throttle({ default: { limit: 10, ttl: 3600000 } }) // 10 per hour
    @Post('request')
    @Roles(Role.AGENT, Role.LANDLORD, Role.ADVERTISER, Role.SELLER, Role.VERIFIER)
    async requestPayout(
        @Request() req: any,
        @Body() body: { amountCents: number; method: PayoutMethod; accountId: string }
    ) {
        return this.payoutsService.createPayoutRequest(
            OwnerType.USER, // Currently forcing USER owner type for authenticated user
            req.user.userId,
            body.amountCents,
            body.method,
            body.accountId,
            Currency.USD // Default currency for now
        );
    }

    @Get('my')
    async getMyPayouts(@Request() req: any) {
        return this.payoutsService.getUserPayoutRequests(req.user.userId);
    }

    @Post('accounts')
    @Roles(Role.AGENT, Role.LANDLORD, Role.ADVERTISER, Role.SELLER, Role.VERIFIER)
    async createAccount(@Request() req: any, @Body() body: { type: string; displayName: string; details: any }) {
        return this.payoutsService.createPayoutAccount(
            OwnerType.USER,
            req.user.userId,
            body.type,
            body.displayName,
            body.details
        );
    }

    @Get('accounts')
    @Roles(Role.AGENT, Role.LANDLORD, Role.ADVERTISER, Role.SELLER, Role.VERIFIER)
    async getAccounts(@Request() req: any) {
        return this.payoutsService.getPayoutAccounts(OwnerType.USER, req.user.userId);
    }
}

