import { Injectable, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
    GovernanceAction,
    GovernanceStatus,
    GovernanceRequest,
    GovernanceValidation,
    DUAL_CONTROL_ACTIONS,
    GOVERNANCE_APPROVER_ROLES,
} from './governance.types';

export interface Actor {
    id: string;
    role: string;
}

@Injectable()
export class GovernanceService {
    private readonly logger = new Logger(GovernanceService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly audit: AuditService
    ) { }

    /**
     * Check if an action requires dual-control approval
     */
    requiresDualControl(action: GovernanceAction): boolean {
        return DUAL_CONTROL_ACTIONS.includes(action);
    }

    /**
     * Validate that audit reason is provided for governance actions
     */
    validateAuditReason(reason?: string): void {
        if (!reason || reason.trim().length < 10) {
            throw new BadRequestException(
                'Governance actions require an audit reason of at least 10 characters'
            );
        }
    }

    /**
     * Create a governance approval request (for dual-control actions)
     */
    async createApprovalRequest(
        request: GovernanceRequest,
        requester: Actor
    ): Promise<string> {
        this.validateAuditReason(request.auditReason);

        // Validate requester has governance role
        if (!GOVERNANCE_APPROVER_ROLES.includes(requester.role as any)) {
            throw new ForbiddenException(
                'Only ADMIN or FINANCE can initiate governance actions'
            );
        }

        const approval = await this.prisma.governanceApproval.create({
            data: {
                action: request.action,
                targetType: request.targetType,
                targetId: request.targetId,
                requesterId: requester.id,
                auditReason: request.auditReason,
                metadata: request.metadata,
                status: GovernanceStatus.PENDING,
            },
        });

        await this.audit.logAction({
            action: 'GOVERNANCE_REQUEST_CREATED',
            actorId: requester.id,
            targetType: 'GovernanceApproval',
            targetId: approval.id,
            metadata: {
                governanceAction: request.action,
                targetType: request.targetType,
                targetId: request.targetId,
                auditReason: request.auditReason,
            },
        });

        this.logger.log(`Governance approval request created: ${approval.id} for ${request.action}`);

        return approval.id;
    }

    /**
     * Approve a pending governance request (dual-control)
     */
    async approveRequest(
        approvalId: string,
        approver: Actor,
        reason?: string
    ): Promise<void> {
        const approval = await this.prisma.governanceApproval.findUnique({
            where: { id: approvalId },
        });

        if (!approval) {
            throw new BadRequestException('Governance approval not found');
        }

        if (approval.status !== GovernanceStatus.PENDING) {
            throw new BadRequestException('Approval is not pending');
        }

        // Validate approver has governance role
        if (!GOVERNANCE_APPROVER_ROLES.includes(approver.role as any)) {
            throw new ForbiddenException('Only ADMIN or FINANCE can approve governance actions');
        }

        // Dual-control: requester cannot approve their own request
        if (approval.requesterId === approver.id) {
            throw new ForbiddenException('Cannot approve your own governance request (dual-control)');
        }

        await this.prisma.governanceApproval.update({
            where: { id: approvalId },
            data: {
                approverId: approver.id,
                status: GovernanceStatus.APPROVED,
                resolvedAt: new Date(),
            },
        });

        await this.audit.logAction({
            action: 'GOVERNANCE_REQUEST_APPROVED',
            actorId: approver.id,
            targetType: 'GovernanceApproval',
            targetId: approvalId,
            metadata: {
                approvalReason: reason,
                originalAction: approval.action,
            },
        });

        this.logger.log(`Governance approval ${approvalId} approved by ${approver.id}`);
    }

    /**
     * Reject a pending governance request
     */
    async rejectRequest(
        approvalId: string,
        approver: Actor,
        reason: string
    ): Promise<void> {
        this.validateAuditReason(reason);

        const approval = await this.prisma.governanceApproval.findUnique({
            where: { id: approvalId },
        });

        if (!approval) {
            throw new BadRequestException('Governance approval not found');
        }

        if (approval.status !== GovernanceStatus.PENDING) {
            throw new BadRequestException('Approval is not pending');
        }

        await this.prisma.governanceApproval.update({
            where: { id: approvalId },
            data: {
                approverId: approver.id,
                status: GovernanceStatus.REJECTED,
                resolvedAt: new Date(),
                metadata: {
                    ...(approval.metadata as object || {}),
                    rejectionReason: reason,
                },
            },
        });

        await this.audit.logAction({
            action: 'GOVERNANCE_REQUEST_REJECTED',
            actorId: approver.id,
            targetType: 'GovernanceApproval',
            targetId: approvalId,
            metadata: { rejectionReason: reason },
        });

        this.logger.log(`Governance approval ${approvalId} rejected by ${approver.id}`);
    }

    /**
     * Validate a governance action - checks if already approved or creates request
     */
    async validateGovernanceAction(
        request: GovernanceRequest,
        actor: Actor,
        approvalId?: string
    ): Promise<GovernanceValidation> {
        this.validateAuditReason(request.auditReason);

        // Check if action requires dual-control
        if (!this.requiresDualControl(request.action)) {
            // Single-control action, just audit and allow
            await this.audit.logAction({
                action: `GOVERNANCE_${request.action}`,
                actorId: actor.id,
                targetType: request.targetType,
                targetId: request.targetId,
                metadata: {
                    auditReason: request.auditReason,
                    ...request.metadata,
                },
            });

            return { valid: true, requiresApproval: false };
        }

        // Dual-control action
        if (!approvalId) {
            // No approval provided, create one
            const newApprovalId = await this.createApprovalRequest(request, actor);
            return {
                valid: false,
                requiresApproval: true,
                approvalId: newApprovalId,
                error: 'This action requires dual-control approval. Approval request created.',
            };
        }

        // Lookup existing approval
        const approval = await this.prisma.governanceApproval.findUnique({
            where: { id: approvalId },
        });

        if (!approval) {
            return { valid: false, requiresApproval: true, error: 'Invalid approval ID' };
        }

        if (approval.status !== GovernanceStatus.APPROVED) {
            return {
                valid: false,
                requiresApproval: true,
                approvalId,
                error: `Approval status is ${approval.status}, not APPROVED`,
            };
        }

        // Valid approved action
        return { valid: true, requiresApproval: false, approvalId };
    }

    /**
     * Get pending approvals for a given role
     */
    async getPendingApprovals(role: string) {
        return this.prisma.governanceApproval.findMany({
            where: { status: GovernanceStatus.PENDING },
            orderBy: { requestedAt: 'desc' },
        });
    }

    /**
     * Get approval history
     */
    async getApprovalHistory(limit: number = 50) {
        return this.prisma.governanceApproval.findMany({
            orderBy: { requestedAt: 'desc' },
            take: limit,
        });
    }
}
