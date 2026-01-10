import { Controller, Post, Body, UseGuards, Request, Get } from '@nestjs/common';
import { InterestsService } from './interests.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Role } from '@propad/config';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

import { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';

@Controller('interests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InterestsController {
    constructor(private readonly interestsService: InterestsService) { }

    @Post('toggle')
    @Roles(Role.USER, Role.AGENT, Role.LANDLORD, Role.ADMIN) // Anyone can save a property
    async toggleInterest(@Request() req: AuthenticatedRequest, @Body() body: { propertyId: string }) {
        return this.interestsService.toggleInterest(req.user.userId, body.propertyId);
    }

    @Get('my')
    @Roles(Role.USER, Role.AGENT, Role.LANDLORD, Role.ADMIN)
    async getMyInterests(@Request() req: AuthenticatedRequest) {
        return this.interestsService.getMyInterests(req.user.userId);
    }
}
