import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { TrustService } from './trust.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Request } from 'express';

@Controller('trust')
@UseGuards(JwtAuthGuard)
export class TrustController {
    constructor(private readonly trustService: TrustService) { }

    @Get('score')
    async getMyTrustScore(@Req() req: any) {
        // Trigger calculation on read to ensure freshness (or use cached if heavy)
        // For B4, we calc on read to show immediate effect of verification
        const score = await this.trustService.calculateUserTrust(req.user.id);
        return { score };
    }
}
