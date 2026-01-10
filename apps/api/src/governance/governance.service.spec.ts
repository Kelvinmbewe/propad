import { Test, TestingModule } from '@nestjs/testing';
import { GovernanceService } from './governance.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { GovernanceAction, GovernanceStatus } from './governance.types';
import { ForbiddenException, BadRequestException } from '@nestjs/common';

describe('GovernanceService', () => {
    let service: GovernanceService;
    let prisma: PrismaService;
    let audit: AuditService;

    const mockPrisma = {
        governanceApproval: {
            create: jest.fn(),
            findUnique: jest.fn(),
            update: jest.fn(),
            findMany: jest.fn(),
        },
    };

    const mockAudit = {
        logAction: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GovernanceService,
                { provide: PrismaService, useValue: mockPrisma },
                { provide: AuditService, useValue: mockAudit },
            ],
        }).compile();

        service = module.get<GovernanceService>(GovernanceService);
        prisma = module.get<PrismaService>(PrismaService);
        audit = module.get<AuditService>(AuditService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('createApprovalRequest', () => {
        it('should create approval request for valid admin usage', async () => {
            const request = {
                action: GovernanceAction.REWARD_GRANT,
                targetType: 'User',
                targetId: 'user-123',
                auditReason: 'Performance bonus for Q3',
            };

            const actor = { id: 'admin-1', role: 'ADMIN' };

            mockPrisma.governanceApproval.create.mockResolvedValue({
                id: 'approval-1',
                ...request,
                status: GovernanceStatus.PENDING,
            });

            const result = await service.createApprovalRequest(request, actor);

            expect(result).toBe('approval-1');
            expect(mockPrisma.governanceApproval.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    action: GovernanceAction.REWARD_GRANT,
                    requesterId: 'admin-1',
                    status: 'PENDING',
                })
            );
            expect(mockAudit.logAction).toHaveBeenCalled();
        });

        it('should throw if role is not authorized', async () => {
            const request = {
                action: GovernanceAction.REWARD_GRANT,
                targetType: 'User',
                auditReason: 'Valid reason',
            };
            const actor = { id: 'user-1', role: 'USER' };

            await expect(service.createApprovalRequest(request, actor)).rejects.toThrow(
                ForbiddenException
            );
        });

        it('should throw if audit reason is too short', async () => {
            const request = {
                action: GovernanceAction.REWARD_GRANT,
                targetType: 'User',
                auditReason: 'short',
            };
            const actor = { id: 'admin-1', role: 'ADMIN' };

            await expect(service.createApprovalRequest(request, actor)).rejects.toThrow(
                BadRequestException
            );
        });
    });

    describe('validateGovernanceAction', () => {
        it('should allow non-dual-control actions immediately', async () => {
            const request = {
                action: GovernanceAction.CONFIG_MODIFY, // Assuming this is not in DUAL_CONTROL_ACTIONS list for test or handled differently
                targetType: 'Config',
                auditReason: 'Safe change',
            };
            const actor = { id: 'admin-1', role: 'ADMIN' };

            // Override DUAL_CONTROL_ACTIONS check by mocking or relying on implementation
            // Logic: if (!this.requiresDualControl(request.action)) ...
            // CONFIG_MODIFY is in enum but not in DUAL_CONTROL_ACTIONS list in types.ts?
            // Let's verify DUAL_CONTROL_ACTIONS content in types.ts if needed.
            // Based on implementation, CONFIG_MODIFY returns valid: true.

            const result = await service.validateGovernanceAction(request, actor);

            expect(result.valid).toBe(true);
            expect(result.requiresApproval).toBe(false);
            expect(mockAudit.logAction).toHaveBeenCalled();
        });

        it('should require approval for dual-control actions', async () => {
            const request = {
                action: GovernanceAction.REWARD_GRANT,
                targetType: 'User',
                auditReason: 'Valid reason string',
            };
            const actor = { id: 'admin-1', role: 'ADMIN' };

            mockPrisma.governanceApproval.create.mockResolvedValue({ id: 'new-approval-1' });

            const result = await service.validateGovernanceAction(request, actor);

            expect(result.valid).toBe(false);
            expect(result.requiresApproval).toBe(true);
            expect(result.approvalId).toBe('new-approval-1');
            expect(mockPrisma.governanceApproval.create).toHaveBeenCalled();
        });

        it('should validate successfully with approved request', async () => {
            const request = {
                action: GovernanceAction.REWARD_GRANT,
                targetType: 'User',
                auditReason: 'Valid reason string',
            };
            const actor = { id: 'admin-1', role: 'ADMIN' };
            const approvalId = 'existing-approval-1';

            mockPrisma.governanceApproval.findUnique.mockResolvedValue({
                id: approvalId,
                status: GovernanceStatus.APPROVED,
            });

            const result = await service.validateGovernanceAction(request, actor, approvalId);

            expect(result.valid).toBe(true);
            expect(result.approvalId).toBe(approvalId);
        });
    });
});
