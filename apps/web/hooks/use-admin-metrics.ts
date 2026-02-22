'use client';

import { useQuery } from '@tanstack/react-query';
import {
  type AdminOverviewMetrics,
  type DailyAdsPoint,
  type TopAgentsResponse,
  type GeoListingsResponse,
  type RewardsEstimate
} from '@propad/sdk';
import { useAuthenticatedSDK } from './use-authenticated-sdk';

export function useOverviewMetrics(options?: { enabled?: boolean }) {
  const sdk = useAuthenticatedSDK();
  const enabled = options?.enabled !== false;
  return useQuery<AdminOverviewMetrics>({
    queryKey: ['admin-metrics', 'overview'],
    queryFn: () => sdk!.metrics.overview(),
    enabled: !!sdk && enabled,
    staleTime: 15_000,
    refetchInterval: enabled ? 30_000 : false
  });
}

export function useDailyAds(from: string, to: string, options?: { enabled?: boolean }) {
  const sdk = useAuthenticatedSDK();
  const enabled = options?.enabled !== false;
  return useQuery<DailyAdsPoint[]>({
    queryKey: ['admin-metrics', 'ads', from, to],
    queryFn: () => sdk!.metrics.dailyAds({ from, to }),
    enabled: !!sdk && Boolean(from) && Boolean(to) && enabled,
    refetchInterval: enabled ? 60_000 : false
  });
}

export function useTopAgents(limit: number, options?: { enabled?: boolean }) {
  const sdk = useAuthenticatedSDK();
  const enabled = options?.enabled !== false;
  return useQuery<TopAgentsResponse>({
    queryKey: ['admin-metrics', 'top-agents', limit],
    queryFn: () => sdk!.metrics.topAgents({ limit }),
    enabled: !!sdk && enabled,
    staleTime: 45_000
  });
}

export function useGeoListings(city: string, options?: { enabled?: boolean }) {
  const sdk = useAuthenticatedSDK();
  const enabled = options?.enabled !== false;
  return useQuery<GeoListingsResponse>({
    queryKey: ['admin-metrics', 'geo-listings', city],
    queryFn: () => sdk!.metrics.geoListings(city),
    enabled: !!sdk && city.trim().length > 0 && enabled,
    refetchInterval: enabled ? 120_000 : false
  });
}

export function useRewardsEstimateMe() {
  const sdk = useAuthenticatedSDK();
  return useQuery<RewardsEstimate>({
    queryKey: ['rewards', 'estimate', 'me'],
    queryFn: () => sdk!.rewards.estimateMe(),
    enabled: !!sdk,
    staleTime: 60_000
  });
}
