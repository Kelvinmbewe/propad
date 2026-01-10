import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
import { ReferralsService } from './referrals.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('referrals')
@UseGuards(JwtAuthGuard)
export class ReferralsController {
    constructor(private referralsService: ReferralsService) { }

    @Get('code')
    async getMyCode(@Request() req: any) {
        return this.referralsService.getOrCreateMyCode(req.user.id);
    }

    @Get('my')
    async getMyReferrals(@Request() req: any) {
        return this.referralsService.getInvitedUsers(req.user.id);
    }

    @Get('stats/my')
    async getMyStats(@Request() req: any) {
        return this.referralsService.getMyStats(req.user.id);
    }

    @Post('claim')
    async claim(@Request() req: any, @Body() body: { code: string }) {
        return this.referralsService.trackSignup({
            userId: req.user.id,
            referralCode: body.code
        });
    }
}
