import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
import { ReferralsService } from './referrals.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@Controller('growth/referrals')
@UseGuards(JwtAuthGuard)
export class ReferralsController {
    constructor(private referralsService: ReferralsService) { }

    @Get('code')
    async getMyCode(@Request() req: any) {
        return this.referralsService.getMyCode(req.user.id);
    }

    @Post('claim')
    async claim(@Request() req: any, @Body() body: { code: string }) {
        return this.referralsService.applyReferral(req.user.id, body.code);
    }
}
