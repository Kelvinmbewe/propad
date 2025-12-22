import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { ProfilesService } from './profiles.service';

@Controller('profiles')
export class ProfilesController {
    constructor(
        private readonly profilesService: ProfilesService
    ) { }

    @Get('users/:id')
    async getUserProfile(@Param('id') id: string) {
        return this.profilesService.getPublicUserProfile(id);
    }

    @Get('companies/:id')
    async getAgencyProfile(@Param('id') id: string) {
        // Changed route to :id for consistency, or keep as slug if preferred.
        // Service expects ID. If slug is needed, service should change.
        // Assuming ID for now as per plan, but route said slug previously.
        // Let's stick to ID for this phase to match service.
        return this.profilesService.getPublicAgencyProfile(id);
    }
}
