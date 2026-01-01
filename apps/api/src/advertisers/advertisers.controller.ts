import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { AdvertisersService } from './advertisers.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('advertisers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADVERTISER' as any, Role.ADMIN)
export class AdvertisersController {
    constructor(private readonly advertisersService: AdvertisersService) { }

    @Get('profile')
    async getProfile(@Request() req: any) {
        return this.advertisersService.getAdvertiserProfile(req.user.id);
    }

    @Get('campaigns')
    async getCampaigns(@Request() req: any) {
        return this.advertisersService.getCampaigns(req.user.id);
    }
}
