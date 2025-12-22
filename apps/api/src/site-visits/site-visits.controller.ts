import { Controller, Post, Body, Param, UseGuards, Request, Get, Patch } from '@nestjs/common';
import { SiteVisitsService } from './site-visits.service';
import { RequestSiteVisitDto, AssignModeratorDto, CompleteSiteVisitDto } from './dto/site-visit.dto';

// Mock Auth Guards for now (Replace with actual AuthGuard in real implementation)
// import { AuthGuard } from '../auth/auth.guard'; 

@Controller('site-visits')
export class SiteVisitsController {
    constructor(private readonly siteVisitsService: SiteVisitsService) { }

    @Post('request')
    async requestVisit(@Body() dto: RequestSiteVisitDto, @Request() req) {
        // const userId = req.user.id; 
        const userId = "mock-user-id"; // Placeholder
        return this.siteVisitsService.requestVisit(userId, dto.propertyId);
    }

    @Get('pending')
    async getPending() {
        // Admin only
        return this.siteVisitsService.getPendingVisits();
    }

    @Post(':id/assign')
    async assignModerator(@Param('id') id: string, @Body() dto: AssignModeratorDto, @Request() req) {
        // Admin only
        return this.siteVisitsService.assignModerator(id, dto.moderatorId, "mock-admin-id");
    }

    @Get('my-assignments')
    async getMyAssignments(@Request() req) {
        // Moderator only
        const userId = "mock-moderator-id";
        return this.siteVisitsService.getModeratorVisits(userId);
    }

    @Post(':id/complete')
    async completeVisit(@Param('id') id: string, @Body() dto: CompleteSiteVisitDto, @Request() req) {
        // Moderator only
        const userId = "mock-moderator-id";
        return this.siteVisitsService.completeVisit(id, userId, dto.gpsLat, dto.gpsLng, dto.notes);
    }
}
