
import { Controller, Get, Param, UseGuards, Query } from '@nestjs/common';
import { RiskService } from './risk.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('admin/risk')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.MODERATOR)
export class RiskController {
    constructor(
        private readonly riskService: RiskService,
        private readonly prisma: PrismaService
    ) { }

    @Get('events')
    async getEvents(
        @Query('entityType') entityType?: string,
        @Query('entityId') entityId?: string,
        @Query('signalType') signalType?: string,
        @Query('limit') limit: string = '50'
    ) {
        return this.prisma.riskEvent.findMany({
            where: {
                ...(entityType ? { entityType: entityType.toUpperCase() } : {}),
                ...(entityId ? { entityId } : {}),
                ...(signalType ? { signalType: signalType.toUpperCase() } : {}),
            },
            orderBy: { timestamp: 'desc' },
            take: parseInt(limit),
        });
    }

    @Get('summary/:type/:id')
    async getEntityRisk(@Param('type') type: string, @Param('id') id: string) {
        const entityType = type.toUpperCase();
        let entity: any = null;

        if (entityType === 'USER') {
            entity = await this.prisma.user.findUnique({ where: { id }, select: { id: true, name: true, email: true, riskScore: true } });
        } else if (entityType === 'AGENCY') {
            entity = await this.prisma.agency.findUnique({ where: { id }, select: { id: true, name: true, riskScore: true } });
        } else if (entityType === 'PROPERTY') {
            entity = await this.prisma.property.findUnique({ where: { id }, select: { id: true, title: true, riskScore: true } });
        }

        if (!entity) return { error: 'Entity not found' };

        const events = await this.prisma.riskEvent.findMany({
            where: { entityType, entityId: id },
            orderBy: { timestamp: 'desc' },
        });

        return {
            entity,
            riskScore: entity.riskScore,
            events,
            penaltyMultiplier: this.riskService.getRiskPenaltyMultiplier(entity.riskScore),
        };
    }
}
