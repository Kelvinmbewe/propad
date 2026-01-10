import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GovernanceService } from './governance.service';
import { GovernanceAction } from './governance.types';

export const GOVERNANCE_ACTION_KEY = 'governance:action';
export const GOVERNANCE_TARGET_TYPE_KEY = 'governance:targetType';

/**
 * Decorator to mark an endpoint as requiring governance approval
 */
export function RequiresGovernance(action: GovernanceAction, targetType: string) {
    return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
        Reflect.defineMetadata(GOVERNANCE_ACTION_KEY, action, descriptor.value);
        Reflect.defineMetadata(GOVERNANCE_TARGET_TYPE_KEY, targetType, descriptor.value);
        return descriptor;
    };
}

@Injectable()
export class GovernanceGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly governanceService: GovernanceService
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const action = this.reflector.get<GovernanceAction>(
            GOVERNANCE_ACTION_KEY,
            context.getHandler()
        );

        if (!action) {
            // No governance requirement on this endpoint
            return true;
        }

        const targetType = this.reflector.get<string>(
            GOVERNANCE_TARGET_TYPE_KEY,
            context.getHandler()
        );

        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user) {
            throw new ForbiddenException('Authentication required');
        }

        // Check for approval ID and audit reason in body or headers
        const approvalId = request.body?.approvalId || request.headers['x-governance-approval'];
        const auditReason = request.body?.auditReason || request.headers['x-audit-reason'];

        if (!auditReason) {
            throw new ForbiddenException('Audit reason is required for governance actions');
        }

        // Get target ID from route params or body
        const targetId = request.params?.id || request.body?.targetId;

        const validation = await this.governanceService.validateGovernanceAction(
            {
                action,
                targetType,
                targetId,
                auditReason,
                metadata: request.body,
            },
            { id: user.id, role: user.role },
            approvalId
        );

        if (!validation.valid) {
            throw new ForbiddenException(
                validation.error || 'Governance validation failed'
            );
        }

        // Attach approval info to request for downstream use
        request.governanceApproval = validation;

        return true;
    }
}
