export interface OverviewMetricsResponse {
  generatedAt: string;
  listings: {
    verified: number;
    pendingVerification: number;
    new7d: number;
    growth7dPct: number;
  };
  leads: {
    total30d: number;
    qualified30d: number;
    conversionRate30d: number;
  };
  agents: {
    total: number;
    active30d: number;
    new7d: number;
  };
  revenue: {
    total30dUsd: number;
    averageDailyUsd: number;
    previous30dUsd: number;
    deltaPct: number;
  };
  payouts: {
    pendingCount: number;
    pendingUsd: number;
    settled30dUsd: number;
  };
  traffic: {
    visits30d: number;
    uniqueSessions30d: number;
    impressions30d: number;
    clicks30d: number;
    ctr30d: number;
  };
}

export interface DailyAdsPoint {
  date: string;
  impressions: number;
  clicks: number;
  revenueUSD: number;
}

export interface TopAgentPerformance {
  agentId: string;
  agentName: string | null;
  verifiedListings: number;
  validLeads: number;
  monthPoints: number;
  estPayoutUSD: number;
}

export interface TopAgentsResponse {
  generatedAt: string;
  items: TopAgentPerformance[];
  limit: number;
  totalAgents: number;
}

export interface GeoListingsResponse {
  generatedAt: string;
  city: {
    id: string;
    name: string;
    province: string;
  };
  suburbs: Array<{
    suburbId: string;
    suburbName: string;
    verifiedListings: number;
    pendingListings: number;
    averagePriceUsd: number | null;
    marketSharePct: number;
  }>;
}

export interface LeadRealtimePayload {
  leadId: string;
  propertyId: string;
  status: string;
  createdAt: string;
}
