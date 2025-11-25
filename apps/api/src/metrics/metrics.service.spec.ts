import { describe, expect, it, vi } from 'vitest';
import { MetricsService } from './metrics.service';

const createPrismaMock = () => {
  const transaction = vi.fn(async (operations: Array<Promise<unknown>>) => Promise.all(operations));
  return {
    property: { count: vi.fn() },
    lead: { count: vi.fn() },
    user: { count: vi.fn() },
    metricDailyRevenue: { aggregate: vi.fn() },
    payoutRequest: { aggregate: vi.fn() },
    metricDailyTraffic: { aggregate: vi.fn() },
    metricDailyAds: { aggregate: vi.fn(), findMany: vi.fn() },
    city: { findFirst: vi.fn() },
    $transaction: transaction,
    $queryRaw: vi.fn()
  };
};

describe('MetricsService', () => {
  it('aggregates overview metrics using cache when missing', async () => {
    const prisma = createPrismaMock();
    prisma.property.count
      .mockResolvedValueOnce(32)
      .mockResolvedValueOnce(6)
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(4);
    prisma.lead.count
      .mockResolvedValueOnce(120)
      .mockResolvedValueOnce(48);
    prisma.user.count
      .mockResolvedValueOnce(18)
      .mockResolvedValueOnce(12)
      .mockResolvedValueOnce(3);
    prisma.metricDailyRevenue.aggregate
      .mockResolvedValueOnce({ _sum: { grossUsdCents: BigInt(450000) } })
      .mockResolvedValueOnce({ _sum: { grossUsdCents: BigInt(300000) } });
    prisma.payoutRequest.aggregate
      .mockResolvedValueOnce({ _sum: { amountCents: BigInt(220000) }, _count: { _all: 3 } })
      .mockResolvedValueOnce({ _sum: { amountCents: BigInt(90000) } });
    prisma.metricDailyTraffic.aggregate.mockResolvedValue({ _sum: { visits: 1800, uniqueSessions: 1100 } });
    prisma.metricDailyAds.aggregate.mockResolvedValue({
      _sum: { impressions: 6200, clicks: 410, revenueMicros: BigInt(0) }
    });

    const cache = {
      getOverview: vi.fn((loader: () => Promise<unknown>) => loader()),
      getDailyAdsRange: vi.fn(),
      getTopAgents: vi.fn()
    };

    const service = new MetricsService(prisma as any, cache as any);
    const result = await service.getOverview();

    expect(cache.getOverview).toHaveBeenCalled();
    expect(prisma.property.count).toHaveBeenCalledTimes(4);
    expect(result.listings.verified).toBe(32);
    expect(result.leads.total30d).toBe(120);
    expect(result.agents.total).toBe(18);
    expect(result.revenue.total30dUsd).toBeCloseTo(4500, 2);
    expect(result.payouts.pendingCount).toBe(3);
  });

  it('delegates daily ads retrieval to cache range resolver', async () => {
    const prisma = createPrismaMock();
    const cache = {
      getOverview: vi.fn(),
      getDailyAdsRange: vi.fn().mockResolvedValue([{ date: '2024-05-01T00:00:00.000Z', impressions: 10, clicks: 1, revenueUSD: 5 }]),
      getTopAgents: vi.fn()
    };

    const service = new MetricsService(prisma as any, cache as any);
    const data = await service.getDailyAds({ from: '2024-05-01', to: '2024-05-02' });

    expect(cache.getDailyAdsRange).toHaveBeenCalledTimes(1);
    expect(data).toHaveLength(1);
    expect(data[0].impressions).toBe(10);
  });
});
