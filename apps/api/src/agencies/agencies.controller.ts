
import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { AgenciesService } from './agencies.service';

@Controller('agencies')
export class AgenciesController {
    constructor(private readonly agenciesService: AgenciesService) { }

    @Get(':id')
    async getAgency(@Param('id') id: string) {
        return this.agenciesService.findOne(id);
    }

    // Admin or Company Admin only in real world
    @Patch(':id')
    async updateProfile(@Param('id') id: string, @Body() body: { bio?: string; registrationNumber?: string }) {
        return this.agenciesService.updateProfile(id, body);
    }

    // Public or Verified User
    @Post(':id/reviews')
    async addReview(@Param('id') id: string, @Body() body: { reviewerId: string; rating: number; comment?: string }) {
        // In real auth, reviewerId comes from token
        return this.agenciesService.addReview(id, body.reviewerId, body.rating, body.comment);
    }
}
