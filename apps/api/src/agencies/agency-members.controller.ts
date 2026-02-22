import {
  Controller,
  Post,
  Delete,
  Body,
  Param,
  Get,
  UseGuards,
  Req,
  ForbiddenException,
  Patch,
} from "@nestjs/common";
import { AgenciesService } from "./agencies.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { Role, AgencyMemberRole } from "@propad/config";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";

@Controller("agencies/:id/members")
@UseGuards(JwtAuthGuard, RolesGuard)
export class AgencyMembersController {
  constructor(
    private readonly agenciesService: AgenciesService,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Post()
  @Roles(Role.COMPANY_ADMIN)
  async addMember(
    @Param("id") agencyId: string,
    @Body() body: { email: string; role: AgencyMemberRole },
    @Req() req: any,
  ) {
    // Verify ownership
    const myAgency = await this.agenciesService.getMyAgency(req.user.id);
    if (myAgency?.id !== agencyId)
      throw new ForbiddenException("Not your agency");

    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email: body.email },
    });
    if (!user) throw new ForbiddenException("User not found");

    // Check if already member
    const existing = await this.prisma.agencyMember.findFirst({
      where: { agencyId, userId: user.id },
    });
    if (existing) throw new ForbiddenException("Already a member");

    // Add
    const member = await this.prisma.agencyMember.create({
      data: {
        agencyId,
        userId: user.id,
        role: body.role,
      },
    });

    await this.audit.logAction({
      action: "AGENCY_MEMBER_ADD",
      actorId: req.user.id,
      targetType: "agency",
      targetId: agencyId,
      metadata: { memberId: member.id, userId: user.id, role: body.role },
    });

    return member;
  }

  @Get()
  @Roles(Role.ADMIN, Role.COMPANY_ADMIN)
  async listMembers(@Param("id") agencyId: string, @Req() req: any) {
    if (req.user.role !== Role.ADMIN) {
      const myAgency = await this.agenciesService.getMyAgency(req.user.id);
      if (myAgency?.id !== agencyId)
        throw new ForbiddenException("Not your agency");
    }

    return this.prisma.agencyMember.findMany({
      where: { agencyId },
      include: { user: true },
      orderBy: { joinedAt: "desc" },
    });
  }

  @Delete(":userId")
  @Roles(Role.COMPANY_ADMIN)
  async removeMember(
    @Param("id") agencyId: string,
    @Param("userId") userIdToRemove: string,
    @Body() body: { reason?: string } = {},
    @Req() req: any,
  ) {
    // Verify ownership
    const myAgency = await this.agenciesService.getMyAgency(req.user.id);
    if (myAgency?.id !== agencyId)
      throw new ForbiddenException("Not your agency");

    await this.prisma.agencyMember.deleteMany({
      where: { agencyId, userId: userIdToRemove },
    });

    await this.audit.logAction({
      action: "AGENCY_MEMBER_REMOVE",
      actorId: req.user.id,
      targetType: "agency",
      targetId: agencyId,
      metadata: { removedUserId: userIdToRemove, reason: body.reason },
    });
    return { success: true };
  }

  @Patch(":userId/status")
  @Roles(Role.COMPANY_ADMIN)
  async updateMemberStatus(
    @Param("id") agencyId: string,
    @Param("userId") userId: string,
    @Body() body: { action: "PAUSE" | "BAN" | "ACTIVATE"; reason?: string },
    @Req() req: any,
  ) {
    const myAgency = await this.agenciesService.getMyAgency(req.user.id);
    if (myAgency?.id !== agencyId)
      throw new ForbiddenException("Not your agency");

    const member = await this.prisma.agencyMember.findFirst({
      where: { agencyId, userId },
    });
    if (!member) throw new ForbiddenException("Member not found");

    const isActive = body.action === "ACTIVATE";
    const revokedAt = body.action === "BAN" ? new Date() : null;

    await this.prisma.agencyMember.update({
      where: { id: member.id },
      data: { isActive, revokedAt },
    });

    await this.audit.logAction({
      action: "AGENCY_MEMBER_STATUS",
      actorId: req.user.id,
      targetType: "agencyMember",
      targetId: member.id,
      metadata: { action: body.action, reason: body.reason },
    });

    return { success: true };
  }
}
