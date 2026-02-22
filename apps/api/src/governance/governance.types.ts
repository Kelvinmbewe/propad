/**
 * Governance action types requiring dual-control
 */
export enum GovernanceAction {
    REWARD_GRANT = 'REWARD_GRANT',
    REWARD_RECALC = 'REWARD_RECALC',
    REFERRAL_OVERRIDE = 'REFERRAL_OVERRIDE',
    PAYOUT_MANUAL = 'PAYOUT_MANUAL',
    CONFIG_MODIFY = 'CONFIG_MODIFY',
}

/**
 * Governance approval status
 */
export enum GovernanceStatus {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
}

/**
 * Roles that can approve governance actions
 */
export const GOVERNANCE_APPROVER_ROLES = ['ADMIN', 'FINANCE'] as const;
export type GovernanceApproverRole = (typeof GOVERNANCE_APPROVER_ROLES)[number];

/**
 * Actions requiring dual-control (ADMIN initiates, FINANCE approves or vice versa)
 */
export const DUAL_CONTROL_ACTIONS: GovernanceAction[] = [
    GovernanceAction.REWARD_GRANT,
    GovernanceAction.REWARD_RECALC,
    GovernanceAction.REFERRAL_OVERRIDE,
    GovernanceAction.PAYOUT_MANUAL,
];

/**
 * Request payload for governance actions
 */
export interface GovernanceRequest {
    action: GovernanceAction;
    targetType: string;
    targetId?: string;
    auditReason: string;
    metadata?: Record<string, any>;
}

/**
 * Governance validation result
 */
export interface GovernanceValidation {
    valid: boolean;
    requiresApproval: boolean;
    approvalId?: string;
    error?: string;
}
