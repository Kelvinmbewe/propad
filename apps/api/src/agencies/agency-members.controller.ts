import { Controller, Post, Delete, Body, Param, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { AgenciesService } from './agencies.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role, AgencyMemberRole } from '@propad/config';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Controller('agencies/:id/members')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AgencyMembersController {
    constructor(
        private readonly agenciesService: AgenciesService,
        private readonly prisma: PrismaService,
        private readonly audit: AuditService
    ) { }

    @Post()
    @Roles(Role.COMPANY_ADMIN)
    async addMember(@Param('id') agencyId: string, @Body() body: { email: string; role: AgencyMemberRole }, @Req() req: any) {
        // Verify ownership
        const myAgency = await this.agenciesService.getMyAgency(req.user.id);
        if (myAgency?.id !== agencyId) throw new ForbiddenException('Not your agency');

        // Find user
        const user = await this.prisma.user.findUnique({ where: { email: body.email } });
        if (!user) throw new ForbiddenException('User not found');

        // Check if already member
        const existing = await this.prisma.agencyMember.findFirst({ where: { agencyId, userId: user.id } });
        if (existing) throw new ForbiddenException('Already a member');

        // Add
        const member = await this.prisma.agencyMember.create({
            data: {
                agencyId,
                userId: user.id,
                role: body.role
            }
        });

        await this.audit.logAction(req.user.id, agencyId, 'AGENCY_MEMBER_ADD', { memberId: member.id, userId: user.id, role: body.role });

        return member;
    }

    @Delete(':userId')
    @Roles(Role.COMPANY_ADMIN)
    async removeMember(@Param('id') agencyId: string, @Param('userId') userIdToRemove: string, @Req() req: any) {
        // Verify ownership
        const myAgency = await this.agenciesService.getMyAgency(req.user.id);
        if (myAgency?.id !== agencyId) throw new ForbiddenException('Not your agency');

        await this.prisma.agencyMember.deleteMany({
            where: { agencyId, userId: userIdToRemove }
        });

        await this.audit.logAction(req.user.id, agencyId, 'AGENCY_MEMBER_REMOVE', { removedUserId: userIdToRemove });
        return { success: true };
    }
}
