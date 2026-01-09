import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { FeatureFlagsService } from './feature-flags.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../roles/roles.guard';
import { Roles } from '../roles/roles.decorator';
import { Role } from '@propad/config';

@Controller('ops')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class OpsController {
    constructor(private readonly featureFlagsService: FeatureFlagsService) { }

    @Get('flags')
    async getFlags() {
        return this.featureFlagsService.getAllFlags();
    }

    @Post('flags')
    async setFlag(@Body() body: { key: string; enabled: boolean }) {
        await this.featureFlagsService.setFlag(body.key, body.enabled);
        return { success: true };
    }
}
