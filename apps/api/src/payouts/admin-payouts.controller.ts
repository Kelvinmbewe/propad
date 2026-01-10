import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { PayoutsService } from './payouts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@propad/config';

@Controller('admin/payouts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminPayoutsController {
    constructor(private readonly payoutsService: PayoutsService) { }

    @Get()
    async getPendingPayouts() {
        return this.payoutsService.getPendingPayouts();
    }

    @Post(':id/approve')
    async approvePayout(@Request() req: any, @Param('id') id: string) {
        return this.payoutsService.approvePayout(id, req.user.id);
    }

    @Post(':id/reject')
    async rejectPayout(@Request() req: any, @Param('id') id: string, @Body() body: { reason: string }) {
        return this.payoutsService.rejectPayout(id, body.reason, req.user.id);
    }

    @Post(':id/process')
    async processPayout(@Request() req: any, @Param('id') id: string, @Body() body: { gatewayRef: string }) {
        return this.payoutsService.processPayout(id, body.gatewayRef, req.user.id);
    }

    @Post(':id/mark-paid')
    async markPaid(@Request() req: any, @Param('id') id: string) {
        return this.payoutsService.markPayoutPaid(id, req.user.id);
    }
}
