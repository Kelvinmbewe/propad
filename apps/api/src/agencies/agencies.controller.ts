
import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { AgenciesService } from './agencies.service';

@Controller('agencies')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AgenciesController {
    constructor(private readonly agenciesService: AgenciesService) { }

    @Get(':id')
    @UseGuards(JwtAuthGuard) // Optional: allow public read? Plan said "No page... without role validation". But profiles are usually public. Let's keep JwtAuthGuard to be safe for now or Public if needed. Plan says "Wrap every API route with role guard".
    async getAgency(@Param('id') id: string) {
        return this.agenciesService.findOne(id);
    }

    @Patch(':id')
    @Roles(Role.ADMIN, Role.COMPANY_ADMIN)
    async updateProfile(@Param('id') id: string, @Body() body: { bio?: string; registrationNumber?: string }, @Req() req: any) {
        // TODO: Enforce ownership if not ADMIN
        return this.agenciesService.updateProfile(id, body);
    }

    @Post(':id/reviews')
    @Roles(Role.USER, Role.AGENT, Role.LANDLORD)
    async addReview(@Param('id') id: string, @Body() body: { rating: number; comment?: string }, @Req() req: any) {
        return this.agenciesService.addReview(id, req.user.userId, body.rating, body.comment);
    }
}
