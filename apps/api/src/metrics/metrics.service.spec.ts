import { describe, expect, it, vi } from 'vitest';
import { PropertyStatus } from '@prisma/client';
import { MetricsService } from './metrics.service';

describe('MetricsService', () => {
  const createPrismaMock = () => ({
    property: {
      count: vi.fn()
    },
    rewardEvent: {
      aggregate: vi.fn()
    }
  });

  it('computes dashboard metrics using properties and reward events', async () => {
    const prisma = createPrismaMock();
    prisma.property.count
      .mockResolvedValueOnce(42)
      .mockResolvedValueOnce(7);
    prisma.rewardEvent.aggregate.mockResolvedValue({ _sum: { usdCents: 12345 } });

    const service = new MetricsService(prisma as any);
    const result = await service.dashboard();

    expect(prisma.property.count).toHaveBeenCalledWith({ where: { status: PropertyStatus.VERIFIED } });
    expect(prisma.property.count).toHaveBeenCalledWith({ where: { status: PropertyStatus.PENDING_VERIFY } });
    expect(prisma.rewardEvent.aggregate).toHaveBeenCalledWith({ _sum: { usdCents: true } });
    expect(result).toEqual({
      activeListings: 42,
      pendingVerifications: 7,
      rewardPoolUsd: 123.45
    });
  });

  it('handles empty reward pool gracefully', async () => {
    const prisma = createPrismaMock();
    prisma.property.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(1);
    prisma.rewardEvent.aggregate.mockResolvedValue({ _sum: { usdCents: null } });

    const service = new MetricsService(prisma as any);
    const result = await service.dashboard();

    expect(result.rewardPoolUsd).toBe(0);
  });

  it('normalises decimal reward totals to numbers', async () => {
    const prisma = createPrismaMock();
    prisma.property.count
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(2);
    const decimalValue = {
      toNumber: vi.fn(() => 4321)
    };
    prisma.rewardEvent.aggregate.mockResolvedValue({ _sum: { usdCents: decimalValue } });

    const service = new MetricsService(prisma as any);
    const result = await service.dashboard();

    expect(decimalValue.toNumber).toHaveBeenCalledTimes(1);
    expect(result.rewardPoolUsd).toBe(43.21);
  });
});
