
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@propad/config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RolesService {
    constructor(private readonly prisma: PrismaService) { }

    async assignRole(userId: string, role: Role, assignedById: string) {
        // 1. Validate hierarchy
        const assigner = await this.prisma.user.findUnique({ where: { id: assignedById } });
        if (!assigner) throw new NotFoundException('Assigner not found');

        // Simple hierarchy check (can be improved)
        // ADMIN -> MODERATOR, COMPANY_ADMIN, etc.
        // MODERATOR -> COMPANY_ADMIN, AGENT, etc.
        // COMPANY_ADMIN -> COMPANY_AGENT

        // Check if user already has role
        const existing = await this.prisma.userRole.findFirst({
            where: { userId, role: role as any, revokedAt: null }
        });

        if (existing) {
            return existing;
        }

        return this.prisma.userRole.create({
            data: {
                userId,
                role: role as any,
                assignedById,
                // active defaults to implicit based on revokedAt
            },
        });
    }

    async revokeRole(userId: string, role: Role, revokedById: string) {
        const userRole = await this.prisma.userRole.findFirst({
            where: { userId, role: role as any, revokedAt: null },
        });

        if (!userRole) {
            throw new NotFoundException('Role not active for user');
        }

        return this.prisma.userRole.update({
            where: { id: userRole.id },
            data: { revokedAt: new Date() },
        });
    }

    async getUserRoles(userId: string) {
        const userRoles = await this.prisma.userRole.findMany({
            where: { userId, revokedAt: null },
            include: { assignedBy: { select: { id: true, name: true } } },
        });

        // Also get the primary role from User model for backward compatibility
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { role: true }
        });

        const roles = userRoles.map((ur: any) => ur.role);
        if (user && !roles.includes(user.role)) {
            roles.push(user.role);
        }

        return {
            roles,
            details: userRoles
        };
    }

    async hasRole(userId: string, role: Role): Promise<boolean> {
        const { roles } = await this.getUserRoles(userId);
        return roles.includes(role);
    }
}
