
import { Body, Controller, Delete, Get, Param, Post, UseGuards, Request } from '@nestjs/common';
import { RolesService } from './roles.service';
import { Role } from '@prisma/client';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // Assuming this exists or similar
// import { RolesGuard } from '../auth/guards/roles.guard'; // Assuming

@Controller('roles')
export class RolesController {
    constructor(private readonly rolesService: RolesService) { }

    // @UseGuards(JwtAuthGuard) // TODO: Enable auth
    @Post('assign')
    async assignRole(@Body() body: { userId: string; role: Role }, @Request() req: any) {
        // const assignerId = req.user.userId;
        const assignerId = 'admin-id'; // Temporary for testing/verification without full auth setup context
        return this.rolesService.assignRole(body.userId, body.role, assignerId);
    }

    // @UseGuards(JwtAuthGuard)
    @Post('revoke')
    async revokeRole(@Body() body: { userId: string; role: Role }, @Request() req: any) {
        const revokerId = 'admin-id';
        return this.rolesService.revokeRole(body.userId, body.role, revokerId);
    }

    @Get(':userId')
    async getUserRoles(@Param('userId') userId: string) {
        return this.rolesService.getUserRoles(userId);
    }
}
