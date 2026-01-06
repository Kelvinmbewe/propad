import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { PayoutsService } from './payouts.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role, PayoutMethod } from '@propad/config';

@Controller('payouts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PayoutsController {
    constructor(private readonly payoutsService: PayoutsService) { }

    @Post('request')
    @Roles(Role.AGENT, Role.LANDLORD) // Users who can request payouts
    async requestPayout(@Request() req: any, @Body() body: { amountCents: number; method: PayoutMethod; accountId: string }) {
        return this.payoutsService.requestPayout(req.user.id, body.amountCents, body.method, body.accountId);
    }

    @Post('approve/:id')
    @Roles(Role.ADMIN)
    async approvePayout(@Request() req: any, @Param('id') id: string) {
        return this.payoutsService.approvePayout(id, req.user.id);
    }

    @Get('my')
    async getMyPayouts(@Request() req: any) {
        return this.payoutsService.getMyPayouts(req.user.id);
    }

    @Get('all')
    @Roles(Role.ADMIN)
    async getAllPayouts() {
        return this.payoutsService.getAllPayouts();
    }
}
