import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { IncentivesDashboardService } from './incentives-dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@propad/config';

@ApiTags('Admin Incentives')
@ApiBearerAuth()
@Controller('admin/incentives')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.FINANCE)
export class IncentivesDashboardController {
    constructor(private readonly dashboardService: IncentivesDashboardService) { }

    @Get('overview')
    @ApiOperation({ summary: 'Get incentives system overview' })
    async getOverview() {
        return this.dashboardService.getOverview();
    }

    @Get('top-earners')
    @ApiOperation({ summary: 'Get top earners by period' })
    @ApiQuery({ name: 'period', required: false, enum: ['day', 'week', 'month', 'all'] })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    async getTopEarners(
        @Query('period') period: 'day' | 'week' | 'month' | 'all' = 'month',
        @Query('limit') limit: number = 50
    ) {
        return this.dashboardService.getTopEarners(period, limit);
    }

    @Get('distribution')
    @ApiOperation({ summary: 'Get reward source distribution' })
    async getSourceDistribution() {
        return this.dashboardService.getSourceDistribution();
    }

    @Get('anomalies')
    @ApiOperation({ summary: 'Get detected anomalies and alerts' })
    async getAnomalies() {
        return this.dashboardService.getAnomalies();
    }
}
