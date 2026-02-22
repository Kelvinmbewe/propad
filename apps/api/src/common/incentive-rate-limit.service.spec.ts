import { Test, TestingModule } from '@nestjs/testing';
import { IncentiveRateLimitService } from './incentive-rate-limit.service';
import { PrismaService } from '../prisma/prisma.service';
import { HttpException } from '@nestjs/common';

describe('IncentiveRateLimitService', () => {
    let service: IncentiveRateLimitService;

    const mockPrisma = {}; // Not used currently as service uses in-memory map

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                IncentiveRateLimitService,
                { provide: PrismaService, useValue: mockPrisma },
            ],
        }).compile();

        service = module.get<IncentiveRateLimitService>(IncentiveRateLimitService);
    });

    afterEach(() => {
        service.clearRateLimits();
    });

    describe('checkRateLimit', () => {
        it('should allow requests within limit', async () => {
            // Limit for MANUAL_PAYOUT is 50/hour
            const res = await service.checkRateLimit('MANUAL_PAYOUT', 'admin-1');
            expect(res.allowed).toBe(true);
        });

        it('should block requests exceeding limit', async () => {
            // Testing with a low limit would be better, but we can flood the existing one
            // Or we can mock the CONFIG.
            // Since CONFIG is private constant in service, we rely on public methods.
            // Let's use DEAl_REWARD which is 1 per day.

            const key = 'prop-1';

            // First request OK
            const res1 = await service.checkRateLimit('DEAL_REWARD', key);
            expect(res1.allowed).toBe(true);

            // Second request blocked
            const res2 = await service.checkRateLimit('DEAL_REWARD', key);
            expect(res2.allowed).toBe(false);
            expect(res2.retryAfterMs).toBeGreaterThan(0);
        });

        it('enforceRateLimit should throw exception', async () => {
            const key = 'prop-2';
            await service.enforceRateLimit('DEAL_REWARD', key); // 1st OK

            await expect(service.enforceRateLimit('DEAL_REWARD', key)).rejects.toThrow(
                HttpException
            );
        });
    });
});
