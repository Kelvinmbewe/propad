import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { AdSenseService } from './adsense.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('adsense')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdSenseController {
    constructor(private readonly adsenseService: AdSenseService) { }

    @Get('stats')
    @Roles(Role.ADMIN)
    async getStats() {
        return this.adsenseService.getStats();
    }

    @Get('sync')
    @Roles(Role.ADMIN)
    async manualSync() {
        await this.adsenseService.syncDailyStats();
        return { success: true };
    }
}
