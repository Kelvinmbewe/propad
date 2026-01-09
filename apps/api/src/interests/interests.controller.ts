import { Controller, Post, Body, UseGuards, Request, Get } from '@nestjs/common';
import { InterestsService } from './interests.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Role } from '@propad/config';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@Controller('interests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InterestsController {
    constructor(private readonly interestsService: InterestsService) { }

    @Post('toggle')
    @Roles(Role.USER, Role.AGENT, Role.LANDLORD, Role.ADMIN) // Anyone can save a property
    async toggleInterest(@Request() req, @Body() body: { propertyId: string }) {
        return this.interestsService.toggleInterest(req.user.userId, body.propertyId);
    }

    @Get('my')
    @Roles(Role.USER, Role.AGENT, Role.LANDLORD, Role.ADMIN)
    async getMyInterests(@Request() req) {
        return this.interestsService.getMyInterests(req.user.userId);
    }
}
