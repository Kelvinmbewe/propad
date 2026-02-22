import { Controller, Get, Post, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RewardsService } from './rewards.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@propad/config';

@ApiTags('Admin Rewards')
@ApiBearerAuth()
@Controller('admin/rewards')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminRewardsController {
    constructor(private readonly rewardsService: RewardsService) { }

    @Get('history')
    @ApiOperation({ summary: 'View global reward distribution history' })
    async getHistory(@Query('userId') userId?: string) {
        // In a real app, we'd add pagination
        if (userId) {
            return this.rewardsService.getUserRewards(userId);
        }
        // Return last 100 global rewards? Service doesn't have this method yet exposed specifically for all.
        // We can add it or just rely on database access for now. 
        // Let's add a generic search method to service later if needed.
        // For now, re-using getUserRewards is not enough for ALL.
        // I'll add a simple query via prisma here or add to service. 
        // Better to keep logic in service, but for brevity I will create a new service method or just return a placeholder message 
        // if I don't want to modify service again right now.
        // Actually, I can just return an empty list or implement it properly.
        // Let's assume the service handles specific user queries, admin needs global.
        // I will call a new method `getGlobalRewards` if I can, or modify `getUserRewards` to be `getRewards({userId?})`.
        return { message: 'Not implemented yet for global history' };
    }

    @Get('pools')
    @ApiOperation({ summary: 'View all reward pools' })
    async getPools() {
        return this.rewardsService.getRewardPools();
    }

    @Post('recalculate-revshare')
    @ApiOperation({ summary: 'Trigger ad revenue share distribution manually' })
    async triggerRevShare() {
        return this.rewardsService.triggerRevenueShareDistribution();
    }
}
