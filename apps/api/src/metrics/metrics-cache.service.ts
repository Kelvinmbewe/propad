import { Injectable } from '@nestjs/common';
import { format, startOfDay } from 'date-fns';
import { CacheService } from '../cache/cache.service';
import { env } from '@propad/config';
import { DailyAdsPoint, OverviewMetricsResponse, TopAgentsResponse } from './metrics.types';

const TTL = Math.max(10, Math.min(env.CACHE_TTL_METRICS_SECONDS ?? 120, 3600));

@Injectable()
export class MetricsCacheService {
  constructor(private readonly cache: CacheService) { }

  private overviewKey() {
    return this.cache.buildKey('metrics', 'overview');
  }

  private dailyKey(date: Date) {
    return this.cache.buildKey('metrics', 'ads', 'daily', format(startOfDay(date), 'yyyyMMdd'));
  }

  private topAgentsKey(limit: number) {
    return this.cache.buildKey('metrics', 'agents', 'top', limit);
  }

  async getOverview(loader: () => Promise<OverviewMetricsResponse>, refresh = false) {
    if (!refresh) {
      const cached = await this.cache.get<OverviewMetricsResponse>(this.overviewKey());
      if (cached) {
        return cached;
      }
    }

    const overview = await loader();
    await this.cache.set(this.overviewKey(), overview, TTL);
    return overview;
  }

  async invalidateOverview() {
    await this.cache.del(this.overviewKey());
  }

  async getTopAgents(
    limit: number,
    loader: () => Promise<TopAgentsResponse>,
    refresh = false
  ): Promise<TopAgentsResponse> {
    const key = this.topAgentsKey(limit);
    if (!refresh) {
      const cached = await this.cache.get<TopAgentsResponse>(key);
      if (cached) {
        return cached;
      }
    }

    const agents = await loader();
    await this.cache.set(key, agents, TTL);
    return agents;
  }

  async invalidateTopAgents() {
    await this.cache.deleteMatching(this.cache.buildKey('metrics', 'agents', 'top', '*'));
  }

  async getDailyAdsRange(
    from: Date,
    to: Date,
    loader: (dates: Date[]) => Promise<DailyAdsPoint[]>,
    refreshDates: Date[] = []
  ) {
    const orderedDates = this.enumerateDates(from, to);
    const resultMap = new Map<string, DailyAdsPoint>();
    const missing: Date[] = [];
    const refreshKeySet = new Set(refreshDates.map((date) => format(startOfDay(date), 'yyyyMMdd')));

    for (const date of orderedDates) {
      const key = this.dailyKey(date);
      const dateKey = format(startOfDay(date), 'yyyyMMdd');
      if (refreshKeySet.has(dateKey)) {
        missing.push(date);
        continue;
      }
      const cached = await this.cache.get<DailyAdsPoint>(key);
      if (cached) {
        resultMap.set(dateKey, cached);
      } else {
        missing.push(date);
      }
    }

    if (missing.length) {
      const computed = await loader(missing.map((date) => startOfDay(date)));
      for (const point of computed) {
        const parsedDate = startOfDay(new Date(point.date));
        const key = this.dailyKey(parsedDate);
        await this.cache.set(key, point, TTL);
        resultMap.set(format(parsedDate, 'yyyyMMdd'), point);
      }
    }

    return orderedDates.map((date) => {
      const key = format(startOfDay(date), 'yyyyMMdd');
      return (
        resultMap.get(key) ?? {
          date: startOfDay(date).toISOString(),
          impressions: 0,
          clicks: 0,
          revenueUSD: 0
        }
      );
    });
  }

  async invalidateDailyAdsForDate(date: Date) {
    await this.cache.del(this.dailyKey(date));
  }

  async invalidateAllDailyAds() {
    await this.cache.deleteMatching(this.cache.buildKey('metrics', 'ads', 'daily', '*'));
  }

  private enumerateDates(from: Date, to: Date) {
    const cursor = startOfDay(from);
    const end = startOfDay(to);
    const dates: Date[] = [];
    while (cursor.getTime() <= end.getTime()) {
      dates.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return dates;
  }
  async get<T>(key: string, loader: () => Promise<T>, ttl: number = TTL, refresh = false): Promise<T> {
    if (!refresh) {
      const cached = await this.cache.get<T>(key);
      if (cached) {
        return cached;
      }
    }

    const data = await loader();
    await this.cache.set(key, data, ttl);
    return data;
  }
}
