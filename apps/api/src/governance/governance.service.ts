import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import {
  GovernanceAction,
  GovernanceStatus,
  GovernanceRequest,
  GovernanceValidation,
  DUAL_CONTROL_ACTIONS,
  GOVERNANCE_APPROVER_ROLES,
} from "./governance.types";

export interface Actor {
  id: string;
  role: string;
}

@Injectable()
export class GovernanceService {
  private readonly logger = new Logger(GovernanceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

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
        "Governance actions require an audit reason of at least 10 characters",
      );
    }
  }

  /**
   * Create a governance approval request (for dual-control actions)
   * Note: governanceApproval model doesn't exist in schema, using audit only
   */
  async createApprovalRequest(
    request: GovernanceRequest,
    requester: Actor,
  ): Promise<string> {
    this.validateAuditReason(request.auditReason);

    // Validate requester has governance role
    if (!GOVERNANCE_APPROVER_ROLES.includes(requester.role as any)) {
      throw new ForbiddenException(
        "Only ADMIN or FINANCE can initiate governance actions",
      );
    }

    // Note: governanceApproval model doesn't exist in schema
    // Generating placeholder ID for compatibility
    const placeholderId = `gov-req-${Date.now()}`;

    await this.audit.logAction({
      action: "GOVERNANCE_REQUEST_CREATED",
      actorId: requester.id,
      targetType: request.targetType,
      targetId: request.targetId,
      metadata: {
        governanceAction: request.action,
        targetType: request.targetType,
        targetId: request.targetId,
        auditReason: request.auditReason,
      },
    });

    this.logger.log(
      `Governance approval request created: ${placeholderId} for ${request.action}`,
    );

    return placeholderId;
  }

  /**
   * Approve a pending governance request (dual-control)
   * Note: governanceApproval model doesn't exist in schema
   */
  async approveRequest(
    approvalId: string,
    approver: Actor,
    reason?: string,
  ): Promise<void> {
    this.validateAuditReason(reason);

    // Note: governanceApproval model doesn't exist, just log audit
    this.logger.warn(
      `Governance approval model not found in schema, skipping approval update`,
    );

    await this.audit.logAction({
      action: "GOVERNANCE_REQUEST_APPROVED",
      actorId: approver.id,
      targetType: "GovernanceApproval",
      targetId: approvalId,
      metadata: {
        approvalReason: reason,
      },
    });

    this.logger.log(
      `Governance approval ${approvalId} approved by ${approver.id}`,
    );
  }

  /**
   * Reject a pending governance request
   * Note: governanceApproval model doesn't exist in schema
   */
  async rejectRequest(
    approvalId: string,
    approver: Actor,
    reason: string,
  ): Promise<void> {
    this.validateAuditReason(reason);

    // Note: governanceApproval model doesn't exist, just log audit
    this.logger.warn(
      `Governance approval model not found in schema, skipping rejection update`,
    );

    await this.audit.logAction({
      action: "GOVERNANCE_REQUEST_REJECTED",
      actorId: approver.id,
      targetType: "GovernanceApproval",
      targetId: approvalId,
      metadata: { rejectionReason: reason },
    });

    this.logger.log(
      `Governance approval ${approvalId} rejected by ${approver.id}`,
    );
  }

  /**
   * Validate a governance action - checks if already approved or creates request
   * Note: Simplified since governanceApproval model doesn't exist
   */
  async validateGovernanceAction(
    request: GovernanceRequest,
    actor: Actor,
    approvalId?: string,
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

    // Dual-control action - always require approval since model doesn't exist
    const newApprovalId = await this.createApprovalRequest(request, actor);
    return {
      valid: false,
      requiresApproval: true,
      approvalId: newApprovalId,
      error:
        "This action requires dual-control approval. Approval request created.",
    };
  }

  /**
   * Get pending approvals for a given role
   * Note: governanceApproval model doesn't exist, returning empty
   */
  async getPendingApprovals(role: string) {
    this.logger.warn(
      `governanceApproval model not found in schema, returning empty list`,
    );
    return [];
  }

  /**
   * Get approval history
   * Note: governanceApproval model doesn't exist, returning empty
   */
  async getApprovalHistory(limit: number = 50) {
    this.logger.warn(
      `governanceApproval model not found in schema, returning empty list`,
    );
    return [];
  }
}
