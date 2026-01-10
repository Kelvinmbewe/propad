import { Test, TestingModule } from '@nestjs/testing';
import { LedgerIntegrityService } from './ledger-integrity.service';
import { PrismaService } from '../prisma/prisma.service';

describe('LedgerIntegrityService', () => {
    let service: LedgerIntegrityService;
    let prisma: PrismaService;

    const mockPrisma = {
        $queryRaw: jest.fn(),
        walletLedger: {
            findMany: jest.fn(),
        },
        rewardDistribution: {
            findUnique: jest.fn(),
            findMany: jest.fn(),
        },
        commission: {
            findUnique: jest.fn(),
            findMany: jest.fn(),
        },
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                LedgerIntegrityService,
                { provide: PrismaService, useValue: mockPrisma },
            ],
        }).compile();

        service = module.get<LedgerIntegrityService>(LedgerIntegrityService);
        prisma = module.get<PrismaService>(PrismaService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('checkNoNegativeBalances', () => {
        it('should return empty list if no negative balances', async () => {
            mockPrisma.$queryRaw.mockResolvedValue([]);
            const violations = await service.checkNoNegativeBalances();
            expect(violations).toEqual([]);
        });

        it('should detect negative balances', async () => {
            mockPrisma.$queryRaw.mockResolvedValue([
                { userId: 'user-1', currency: 'USD', balance: -500 },
            ]);
            const violations = await service.checkNoNegativeBalances();
            expect(violations).toHaveLength(1);
            expect(violations[0].type).toBe('NEGATIVE_BALANCE');
            expect(violations[0].userId).toBe('user-1');
        });
    });

    describe('checkNoOrphanEntries', () => {
        it('should detect orphan reward entries', async () => {
            // Mock orphan Ledger entries
            mockPrisma.walletLedger.findMany.mockResolvedValueOnce([
                { id: 'ledger-1', userId: 'user-1', sourceId: 'missing-reward-id' }
            ]); // For rewards check

            // Ensure second call (for commissions check) returns empty to isolate test
            mockPrisma.walletLedger.findMany.mockResolvedValueOnce([]);

            // Mock reward distribution lookup returning null (missing)
            mockPrisma.rewardDistribution.findUnique.mockResolvedValue(null);

            const violations = await service.checkNoOrphanEntries();
            expect(violations).toHaveLength(1);
            expect(violations[0].type).toBe('ORPHAN_ENTRY');
            expect(violations[0].entryId).toBe('ledger-1');
        });
    });
});
