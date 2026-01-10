import { Controller, Post, Body, Param, UseGuards, Req, Get, Patch } from '@nestjs/common';
import { SiteVisitsService } from './site-visits.service';
import { RequestSiteVisitDto, AssignModeratorDto, CompleteSiteVisitDto } from './dto/site-visit.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@propad/config';

interface AuthenticatedRequest {
    user: {
        userId: string;
        role: Role;
    };
}

@Controller('site-visits')
export class SiteVisitsController {
    constructor(private readonly siteVisitsService: SiteVisitsService) { }

    @Post('request')
    @UseGuards(JwtAuthGuard)
    async requestVisit(@Body() dto: RequestSiteVisitDto, @Req() req: AuthenticatedRequest) {
        return this.siteVisitsService.requestVisit(req.user.userId, dto.propertyId);
    }

    @Get('pending')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN, Role.MODERATOR)
    async getPending() {
        return this.siteVisitsService.getPendingVisits();
    }

    @Get('my-assignments')
    @UseGuards(JwtAuthGuard)
    async getMyAssignments(@Req() req: AuthenticatedRequest) {
        return this.siteVisitsService.getModeratorVisits(req.user.userId);
    }

    @Get('eligible-officers')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    async getEligibleOfficers() {
        return this.siteVisitsService.getEligibleOfficers();
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard)
    async getVisit(@Param('id') id: string) {
        return this.siteVisitsService.getVisitById(id);
    }

    @Post(':id/assign')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN) // ADMIN only for manual assignment
    async assignModerator(@Param('id') id: string, @Body() dto: AssignModeratorDto, @Req() req: AuthenticatedRequest) {
        return this.siteVisitsService.assignModerator(id, dto.moderatorId, req.user.userId);
    }

    @Post(':id/complete')
    @UseGuards(JwtAuthGuard)
    async completeVisit(@Param('id') id: string, @Body() dto: CompleteSiteVisitDto, @Req() req: AuthenticatedRequest) {
        // Only assigned officer can submit visit GPS
        return this.siteVisitsService.completeVisit(id, req.user.userId, dto.gpsLat, dto.gpsLng, dto.notes);
    }
}
