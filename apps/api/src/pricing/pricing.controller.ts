import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { PricingService } from './pricing.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@propad/config';

@Controller('admin/pricing')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class PricingController {
    constructor(private readonly pricingService: PricingService) { }

    @Get()
    async getConfigs() {
        return this.pricingService.getAllConfigs();
    }

    @Post()
    async setConfig(@Body() body: { key: string; value: any; description?: string }) {
        await this.pricingService.setConfig(body.key, body.value, body.description);
        return { success: true };
    }
}
