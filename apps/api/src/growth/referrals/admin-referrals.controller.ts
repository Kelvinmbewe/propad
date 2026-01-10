import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ReferralsService } from './referrals.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '@propad/config';

@Controller('admin/referrals')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminReferralsController {
    constructor(private referralsService: ReferralsService) { }

    @Get()
    async getAll() {
        return this.referralsService.getAllReferrals();
    }

    @Post(':id/resolve')
    async resolve(@Param('id') id: string) {
        // Manual override to REWARDED if qualified but stuck, or just force distribution
        return this.referralsService.distributeReward(id);
    }
}
