import { Controller, Get, Post, Body, UseGuards, Param } from '@nestjs/common';
import { RiskService } from './risk.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../roles/roles.guard';
import { Roles } from '../roles/roles.decorator';
import { Role } from '@propad/config';
import { PrismaService } from '../prisma/prisma.service';

@Controller('admin/security')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class SecurityController {
    constructor(
        private readonly riskService: RiskService,
        private readonly prisma: PrismaService
    ) { }

    @Get('events')
    async getEvents() {
        return this.riskService.getRecentEvents();
    }

    @Post('unlock/:userId')
    async unlockUser(@Param('userId') userId: string) {
        await this.prisma.user.update({
            where: { id: userId },
            data: {
                failedLoginAttempts: 0,
                lockedUntil: null
            }
        });
        await this.riskService.logEvent(userId, 'ADMIN_UNLOCK', 'MEDIUM');
        return { success: true };
    }
}
