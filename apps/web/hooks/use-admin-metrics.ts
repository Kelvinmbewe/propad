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

export function useOverviewMetrics() {
  const sdk = useAuthenticatedSDK();
  return useQuery<AdminOverviewMetrics>({
    queryKey: ['admin-metrics', 'overview'],
    queryFn: () => sdk!.metrics.overview(),
    enabled: !!sdk,
    staleTime: 15_000,
    refetchInterval: 30_000
  });
}

export function useDailyAds(from: string, to: string) {
  const sdk = useAuthenticatedSDK();
  return useQuery<DailyAdsPoint[]>({
    queryKey: ['admin-metrics', 'ads', from, to],
    queryFn: () => sdk!.metrics.dailyAds({ from, to }),
    enabled: !!sdk && Boolean(from) && Boolean(to),
    refetchInterval: 60_000
  });
}

export function useTopAgents(limit: number) {
  const sdk = useAuthenticatedSDK();
  return useQuery<TopAgentsResponse>({
    queryKey: ['admin-metrics', 'top-agents', limit],
    queryFn: () => sdk!.metrics.topAgents({ limit }),
    enabled: !!sdk,
    staleTime: 45_000
  });
}

export function useGeoListings(city: string) {
  const sdk = useAuthenticatedSDK();
  return useQuery<GeoListingsResponse>({
    queryKey: ['admin-metrics', 'geo-listings', city],
    queryFn: () => sdk!.metrics.geoListings(city),
    enabled: !!sdk && city.trim().length > 0,
    refetchInterval: 120_000
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
