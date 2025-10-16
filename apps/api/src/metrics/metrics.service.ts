import { Injectable } from '@nestjs/common';
import {
  LeadStatus,
  PayoutStatus,
  PropertyStatus,
  Role,
  Prisma
} from '@prisma/client';
import {
  addDays,
  differenceInCalendarDays,
  formatISO,
  parseISO,
  startOfDay,
  subDays
} from 'date-fns';
import { PrismaService } from '../prisma/prisma.service';
import {
  DailyAdsPoint,
  GeoListingsResponse,
  OverviewMetricsResponse,
  TopAgentPerformance,
  TopAgentsResponse
} from './metrics.types';
import { MetricsCacheService } from './metrics-cache.service';

interface DailyAdsQuery {
  from: string;
  to: string;
}

@Injectable()
export class MetricsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: MetricsCacheService
  ) {}

  async getOverview(options?: { refresh?: boolean }): Promise<OverviewMetricsResponse> {
    return this.cache.getOverview(() => this.computeOverview(), options?.refresh ?? false);
  }

  async getDailyAds(query: DailyAdsQuery, options?: { refreshDates?: Date[] }) {
    const fromDate = startOfDay(parseISO(query.from));
    const toDate = startOfDay(parseISO(query.to));
    return this.cache.getDailyAdsRange(fromDate, toDate, (dates) => this.computeDailyAdsForDates(dates), options?.refreshDates);
  }

  async computeDailyAdsForDates(dates: Date[]): Promise<DailyAdsPoint[]> {
    if (!dates.length) {
      return [];
    }
    const normalized = dates.map((date) => startOfDay(date));
    const existing = await this.prisma.metricDailyAds.findMany({
      where: { date: { in: normalized } }
    });

    const formatKey = (date: Date) => formatISO(startOfDay(date));
    const records = new Map<string, { date: Date; impressions: number; clicks: number; revenueMicros: bigint }>();
    for (const row of existing) {
      records.set(formatKey(row.date), {
        date: startOfDay(row.date),
        impressions: row.impressions,
        clicks: row.clicks,
        revenueMicros: BigInt(row.revenueMicros)
      });
    }

    const missing = normalized.filter((date) => !records.has(formatKey(date)));
    if (missing.length) {
      const minDate = missing.reduce((min, current) => (current < min ? current : min));
      const maxDate = missing.reduce((max, current) => (current > max ? current : max));
      const inclusiveEnd = addDays(maxDate, 1);

      const raw = await this.prisma.$queryRaw<Array<{ date: Date; impressions: number; revenue_micros: bigint; clicks: number }>>`
        SELECT
          date_trunc('day', "createdAt") AS date,
          COUNT(*)::int AS impressions,
          COALESCE(SUM("revenueMicros"), 0)::bigint AS revenue_micros,
          COUNT(*) FILTER (WHERE "route" LIKE '/properties/%')::int AS clicks
        FROM "AdImpression"
        WHERE "createdAt" >= ${minDate}
          AND "createdAt" < ${inclusiveEnd}
        GROUP BY 1
      `;

      for (const row of raw) {
        const date = startOfDay(row.date);
        const key = formatKey(date);
        records.set(key, {
          date,
          impressions: row.impressions,
          clicks: row.clicks,
          revenueMicros: row.revenue_micros
        });
        await this.prisma.metricDailyAds.upsert({
          where: { date },
          update: {
            impressions: row.impressions,
            clicks: row.clicks,
            revenueMicros: row.revenue_micros
          },
          create: {
            date,
            impressions: row.impressions,
            clicks: row.clicks,
            revenueMicros: row.revenue_micros
          }
        });
      }

      for (const date of missing) {
        const key = formatKey(date);
        if (!records.has(key)) {
          records.set(key, {
            date,
            impressions: 0,
            clicks: 0,
            revenueMicros: BigInt(0)
          });
        }
      }
    }

    return normalized.map((date) => {
      const entry = records.get(formatKey(date));
      if (!entry) {
        return {
          date: startOfDay(date).toISOString(),
          impressions: 0,
          clicks: 0,
          revenueUSD: 0
        } satisfies DailyAdsPoint;
      }
      return {
        date: entry.date.toISOString(),
        impressions: entry.impressions,
        clicks: entry.clicks,
        revenueUSD: Number(entry.revenueMicros) / 1_000_000
      } satisfies DailyAdsPoint;
    });
  }

  async getTopAgents(limit: number, options?: { refresh?: boolean }): Promise<TopAgentsResponse> {
    return this.cache.getTopAgents(limit, () => this.computeTopAgents(limit), options?.refresh ?? false);
  }

  async getGeoListings(city: string): Promise<GeoListingsResponse> {
    const cityRecord = await this.prisma.city.findFirst({
      where: { name: { equals: city, mode: 'insensitive' } },
      select: { id: true, name: true, province: { select: { name: true } } }
    });

    if (!cityRecord) {
      return {
        generatedAt: new Date().toISOString(),
        city: { id: 'unknown', name: city, province: 'Unknown' },
        suburbs: []
      };
    }

    const results = await this.prisma.$queryRaw<Array<{
      suburb_id: string;
      suburb_name: string;
      verified_listings: number;
      pending_listings: number;
      average_price: Prisma.Decimal | null;
    }>>`
      SELECT
        s.id AS suburb_id,
        s.name AS suburb_name,
        COUNT(p.*) FILTER (WHERE p.status = 'VERIFIED')::int AS verified_listings,
        COUNT(p.*) FILTER (WHERE p.status = 'PENDING_VERIFY')::int AS pending_listings,
        AVG(p.price) FILTER (WHERE p.status = 'VERIFIED') AS average_price
      FROM "Suburb" s
      LEFT JOIN "Property" p ON p."suburbId" = s.id
      WHERE s."cityId" = ${cityRecord.id}
      GROUP BY s.id
      ORDER BY verified_listings DESC, pending_listings DESC
    `;

    const totalVerified = results.reduce((sum, row) => sum + row.verified_listings, 0);

    return {
      generatedAt: new Date().toISOString(),
      city: {
        id: cityRecord.id,
        name: cityRecord.name,
        province: cityRecord.province.name
      },
      suburbs: results.map((row) => ({
        suburbId: row.suburb_id,
        suburbName: row.suburb_name,
        verifiedListings: row.verified_listings,
        pendingListings: row.pending_listings,
        averagePriceUsd: row.average_price ? Number(row.average_price) : null,
        marketSharePct: totalVerified === 0 ? 0 : (row.verified_listings / totalVerified) * 100
      }))
    };
  }

  private async computeTopAgents(limit: number): Promise<TopAgentsResponse> {
    const now = new Date();
    const monthStart = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));

    const agents = await this.prisma.$queryRaw<Array<TopAgentPerformance>>`
      SELECT
        u.id AS "agentId",
        u.name AS "agentName",
        COALESCE(SUM(CASE WHEN p.status = 'VERIFIED' THEN 1 ELSE 0 END), 0)::int AS "verifiedListings",
        COALESCE(SUM(CASE WHEN l.status IN ('QUALIFIED', 'CLOSED') THEN 1 ELSE 0 END), 0)::int AS "validLeads",
        COALESCE(SUM(CASE WHEN re."createdAt" >= ${monthStart} THEN re.points ELSE 0 END), 0)::int AS "monthPoints",
        COALESCE(SUM(CASE WHEN re."createdAt" >= ${monthStart} THEN re."usdCents" ELSE 0 END), 0)::int / 100.0 AS "estPayoutUSD"
      FROM "User" u
      LEFT JOIN "Property" p ON p."agentOwnerId" = u.id
      LEFT JOIN "Lead" l ON l."propertyId" = p.id AND l."createdAt" >= ${monthStart}
      LEFT JOIN "RewardEvent" re ON re."agentId" = u.id
      WHERE u.role = 'AGENT'
      GROUP BY u.id
      ORDER BY "monthPoints" DESC, "estPayoutUSD" DESC
      LIMIT ${limit}
    `;

    const totalAgents = await this.prisma.user.count({ where: { role: Role.AGENT } });

    return {
      generatedAt: now.toISOString(),
      items: agents.map((agent) => ({
        ...agent,
        estPayoutUSD: typeof agent.estPayoutUSD === 'number' ? agent.estPayoutUSD : Number(agent.estPayoutUSD)
      })),
      limit,
      totalAgents
    };
  }

  private async computeOverview(): Promise<OverviewMetricsResponse> {
    const now = new Date();
    const today = startOfDay(now);
    const sevenDayStart = subDays(today, 6);
    const previousSevenStart = subDays(sevenDayStart, 7);
    const previousSevenEnd = subDays(sevenDayStart, 1);
    const thirtyDayStart = subDays(today, 29);
    const previousThirtyStart = subDays(thirtyDayStart, 30);
    const previousThirtyEnd = subDays(thirtyDayStart, 1);

    const [
      verifiedCount,
      pendingCount,
      newVerified,
      previousVerified,
      leadsTotal30d,
      leadsValid30d,
      agentsTotal,
      agentsActive,
      agentsNew,
      revenueCurrent,
      revenuePrevious,
      payoutsPending,
      payoutsSettled,
      trafficAggregate,
      adsAggregate
    ] = await this.prisma.$transaction([
      this.prisma.property.count({ where: { status: PropertyStatus.VERIFIED } }),
      this.prisma.property.count({ where: { status: PropertyStatus.PENDING_VERIFY } }),
      this.prisma.property.count({
        where: {
          status: PropertyStatus.VERIFIED,
          verifiedAt: { gte: sevenDayStart }
        }
      }),
      this.prisma.property.count({
        where: {
          status: PropertyStatus.VERIFIED,
          verifiedAt: { gte: previousSevenStart, lte: previousSevenEnd }
        }
      }),
      this.prisma.lead.count({ where: { createdAt: { gte: thirtyDayStart } } }),
      this.prisma.lead.count({
        where: {
          createdAt: { gte: thirtyDayStart },
          status: { in: [LeadStatus.QUALIFIED, LeadStatus.CLOSED] }
        }
      }),
      this.prisma.user.count({ where: { role: Role.AGENT } }),
      this.prisma.user.count({
        where: {
          role: Role.AGENT,
          OR: [
            { rewardEvents: { some: { createdAt: { gte: thirtyDayStart } } } },
            {
              propertiesOwned: {
                some: {
                  status: PropertyStatus.VERIFIED,
                  verifiedAt: { gte: thirtyDayStart }
                }
              }
            },
            { leads: { some: { createdAt: { gte: thirtyDayStart } } } }
          ]
        }
      }),
      this.prisma.user.count({ where: { role: Role.AGENT, createdAt: { gte: sevenDayStart } } }),
      this.prisma.metricDailyRevenue.aggregate({
        where: { date: { gte: thirtyDayStart, lte: today } },
        _sum: { grossUsdCents: true }
      }),
      this.prisma.metricDailyRevenue.aggregate({
        where: { date: { gte: previousThirtyStart, lte: previousThirtyEnd } },
        _sum: { grossUsdCents: true }
      }),
      this.prisma.payoutRequest.aggregate({
        where: { status: { notIn: [PayoutStatus.PAID, PayoutStatus.FAILED, PayoutStatus.CANCELLED] } },
        _sum: { amountCents: true },
        _count: { _all: true }
      }),
      this.prisma.payoutRequest.aggregate({
        where: { status: PayoutStatus.PAID, updatedAt: { gte: thirtyDayStart } },
        _sum: { amountCents: true }
      }),
      this.prisma.metricDailyTraffic.aggregate({
        where: { date: { gte: thirtyDayStart, lte: today } },
        _sum: { visits: true, uniqueSessions: true }
      }),
      this.prisma.metricDailyAds.aggregate({
        where: { date: { gte: thirtyDayStart, lte: today } },
        _sum: { impressions: true, clicks: true, revenueMicros: true }
      })
    ]);

    const leadsConversion = leadsTotal30d === 0 ? 0 : (leadsValid30d / leadsTotal30d) * 100;
    const growthPct = previousVerified === 0 ? 100 : ((newVerified - previousVerified) / previousVerified) * 100;
    const revenueCurrentUsd = this.asNumber(revenueCurrent._sum.grossUsdCents) / 100;
    const revenuePreviousUsd = this.asNumber(revenuePrevious._sum.grossUsdCents) / 100;
    const revenueDeltaPct =
      revenuePreviousUsd === 0
        ? 100
        : ((revenueCurrentUsd - revenuePreviousUsd) / revenuePreviousUsd) * 100;
    const payoutsPendingUsd = this.asNumber(payoutsPending._sum.amountCents) / 100;
    const payoutsSettledUsd = this.asNumber(payoutsSettled._sum.amountCents) / 100;
    const impressions = adsAggregate._sum.impressions ?? 0;
    const clicks = adsAggregate._sum.clicks ?? 0;
    const ctr = impressions === 0 ? 0 : (clicks / impressions) * 100;

    return {
      generatedAt: now.toISOString(),
      listings: {
        verified: verifiedCount,
        pendingVerification: pendingCount,
        new7d: newVerified,
        growth7dPct: Number(growthPct.toFixed(2))
      },
      leads: {
        total30d: leadsTotal30d,
        qualified30d: leadsValid30d,
        conversionRate30d: Number(leadsConversion.toFixed(2))
      },
      agents: {
        total: agentsTotal,
        active30d: agentsActive,
        new7d: agentsNew
      },
      revenue: {
        total30dUsd: Number(revenueCurrentUsd.toFixed(2)),
        averageDailyUsd: Number((revenueCurrentUsd / Math.max(1, differenceInCalendarDays(today, thirtyDayStart) + 1)).toFixed(2)),
        previous30dUsd: Number(revenuePreviousUsd.toFixed(2)),
        deltaPct: Number(revenueDeltaPct.toFixed(2))
      },
      payouts: {
        pendingCount: payoutsPending._count._all,
        pendingUsd: Number(payoutsPendingUsd.toFixed(2)),
        settled30dUsd: Number(payoutsSettledUsd.toFixed(2))
      },
      traffic: {
        visits30d: trafficAggregate._sum.visits ?? 0,
        uniqueSessions30d: trafficAggregate._sum.uniqueSessions ?? 0,
        impressions30d: impressions,
        clicks30d: clicks,
        ctr30d: Number(ctr.toFixed(2))
      }
    };
  }

  private asNumber(value: bigint | number | null | undefined) {
    if (value === null || value === undefined) {
      return 0;
    }
    return typeof value === 'bigint' ? Number(value) : value;
  }
}
