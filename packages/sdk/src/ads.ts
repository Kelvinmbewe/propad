export interface CreateCampaignDto {
  name: string;
  type: "PROPERTY_BOOST" | "BANNER" | "SEARCH_SPONSOR";
  targetPropertyId?: string;
  budgetCents?: number;
  dailyCapCents?: number;
  dailyCapImpressions?: number;
  startAt: string;
  endAt?: string;
  cpmUsdCents?: number;
  cpcUsdCents?: number;
  targetingJson?: Record<string, unknown>;
}

export interface UpdateCampaignDto {
  name?: string;
  budgetCents?: number;
  dailyCapCents?: number;
  dailyCapImpressions?: number;
  endAt?: string | null;
  cpmUsdCents?: number;
  cpcUsdCents?: number;
  targetingJson?: Record<string, unknown>;
  status?: "DRAFT" | "ACTIVE" | "PAUSED" | "ENDED";
}

export interface TrackImpressionDto {
  campaignId: string;
  flightId?: string;
  placementId?: string;
  propertyId?: string;
  sessionId: string;
  route: string;
}

export interface TrackClickDto {
  campaignId: string;
  flightId?: string;
  placementId?: string;
  propertyId?: string;
  sessionId: string;
  clickUrl?: string;
}

export interface Campaign {
  id: string;
  advertiserId: string;
  name: string;
  type?: "PROPERTY_BOOST" | "BANNER" | "SEARCH_SPONSOR";
  targetPropertyId?: string;
  budgetCents?: number;
  spentCents: number;
  dailyCapCents?: number;
  dailyCapImpressions?: number;
  startAt: string;
  endAt?: string;
  cpmUsdCents?: number;
  cpcUsdCents?: number;
  status: "DRAFT" | "ACTIVE" | "PAUSED" | "ENDED";
  createdAt: string;
  updatedAt: string;
  advertiser?: {
    id: string;
    name: string;
    balanceCents: number;
  };
  targetProperty?: {
    id: string;
    title: string;
  };
  stats?: Array<{
    impressions: number;
    clicks: number;
    revenueMicros: number;
  }>;
}

export interface CampaignAnalytics {
  campaign: {
    id: string;
    name: string;
    status: string;
    type: string;
  };
  analytics: {
    impressions: number;
    clicks: number;
    ctr: number;
    totalSpendCents: number;
    budgetCents?: number;
    remainingBudget?: number | null;
  };
  timeSeries: Array<{
    date: string;
    impressions: number;
    clicks: number;
    spendCents: number;
  }>;
}

export interface AdPlacement {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  allowedTypes: string[];
  page: string;
  position: string;
  allowDirect: boolean;
  allowAdSense: boolean;
  policyCompliant: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdvertiserAnalyticsSummary {
  summary: {
    current: {
      impressions: number;
      clicks: number;
      ctr: number;
      spendCents: number;
    };
    previous: {
      impressions: number;
      clicks: number;
      ctr: number;
      spendCents: number;
    };
    trends: {
      impressions: number;
      clicks: number;
      ctr: number;
      spendCents: number;
    };
  };
  campaigns: {
    active: number;
    paused: number;
    ended: number;
  };
  breakdown: Array<{
    id: string;
    name: string;
    type: string;
    status: string;
    impressions: number;
    clicks: number;
    ctr: number;
    spendCents: number;
  }>;
  timeSeries: Array<{
    date: string;
    impressions: number;
    clicks: number;
    spendCents: number;
  }>;
}

export class AdsModule {
  constructor(private client: any) {}

  // ========== EXISTING ==========

  async getActive() {
    return this.client.get("/ads/active");
  }

  async getStats(id: string) {
    return this.client.get(`/ads/stats/${id}`);
  }

  // ========== CAMPAIGNS ==========

  async createCampaign(dto: CreateCampaignDto): Promise<Campaign> {
    return this.client.post("/ads/campaigns", dto);
  }

  async getMyCampaigns(): Promise<Campaign[]> {
    return this.client.get("/ads/campaigns/my");
  }

  async getCampaignById(id: string): Promise<Campaign> {
    return this.client.get(`/ads/campaigns/${id}`);
  }

  async updateCampaign(id: string, dto: UpdateCampaignDto): Promise<Campaign> {
    return this.client.patch(`/ads/campaigns/${id}`, dto);
  }

  async pauseCampaign(id: string): Promise<Campaign> {
    return this.client.post(`/ads/campaigns/${id}/pause`);
  }

  async resumeCampaign(id: string): Promise<Campaign> {
    return this.client.post(`/ads/campaigns/${id}/resume`);
  }

  async getCampaignAnalytics(id: string): Promise<CampaignAnalytics> {
    return this.client.get(`/ads/analytics/campaign/${id}`);
  }

  async getAnalyticsSummary(): Promise<AdvertiserAnalyticsSummary> {
    return this.client.get("/ads/analytics/summary");
  }

  async getAdminAnalytics(): Promise<any> {
    return this.client.get("/admin/ads/analytics");
  }

  async getPlacements(): Promise<AdPlacement[]> {
    return this.client.get("/ads/placements");
  }

  async getAdvertisers(): Promise<any[]> {
    return this.client.get("/ads/advertisers");
  }

  async createPlacement(payload: {
    code: string;
    name: string;
    description?: string | null;
    page: string;
    position: string;
    allowedTypes?: string[];
    allowDirect?: boolean;
    allowAdSense?: boolean;
    policyCompliant?: boolean;
  }) {
    return this.client.post("/ads/placements", payload);
  }

  async updatePlacement(
    id: string,
    payload: {
      code?: string;
      name?: string;
      description?: string | null;
      page?: string;
      position?: string;
      allowedTypes?: string[];
      allowDirect?: boolean;
      allowAdSense?: boolean;
      policyCompliant?: boolean;
    },
  ) {
    return this.client.patch(`/ads/placements/${id}`, payload);
  }

  async getAdvertiser(): Promise<{
    id: string;
    name: string;
    contactEmail?: string | null;
    balanceCents?: number | null;
  }> {
    return this.client.get("/ads/advertiser");
  }

  async getCreatives(): Promise<any[]> {
    return this.client.get("/ads/creatives");
  }

  async createCreative(payload: {
    type: string;
    htmlSnippet: string;
    clickUrl: string;
    width: number;
    height: number;
  }) {
    return this.client.post("/ads/creatives", payload);
  }

  async uploadCreative(payload: {
    file: File;
    clickUrl: string;
    width: number;
    height: number;
  }) {
    const formData = new FormData();
    formData.append("file", payload.file);
    formData.append("clickUrl", payload.clickUrl);
    formData.append("width", String(payload.width));
    formData.append("height", String(payload.height));
    return this.client.post("/ads/creatives/upload", formData);
  }

  async deleteCreative(id: string) {
    return this.client.delete(`/ads/creatives/${id}`);
  }

  async requestWithdrawal(payload: {
    amountCents: number;
    reason?: string;
    referenceId?: string;
  }) {
    return this.client.post("/ads/withdrawals/request", payload);
  }

  async requestWithdrawalReversal(payload: {
    amountCents: number;
    reason?: string;
    referenceId?: string;
  }) {
    return this.client.post("/ads/withdrawals/reversal", payload);
  }

  // ========== BALANCE ==========

  async getBalance(): Promise<{ balanceCents: number }> {
    return this.client.get("/ads/balance");
  }

  async topUp(
    advertiserId: string,
    amountCents: number,
  ): Promise<{ balanceCents: number }> {
    return this.client.post(`/ads/topup/${advertiserId}`, { amountCents });
  }

  async createTopupIntent(payload: {
    amountCents: number;
    currency?: string;
    gateway?: string;
    returnUrl?: string;
  }) {
    return this.client.post("/ads/topup-intent", payload);
  }

  // ========== TRACKING ==========

  async trackImpression(
    dto: TrackImpressionDto,
  ): Promise<{ success: boolean; impressionId?: string; reason?: string }> {
    return this.client.post("/ads/track/impression", dto);
  }

  async trackClick(
    dto: TrackClickDto,
  ): Promise<{ success: boolean; clickId?: string; reason?: string }> {
    return this.client.post("/ads/track/click", dto);
  }

  // ========== PROMOTED LISTINGS ==========

  async getPromoted(params?: {
    cityId?: string;
    suburbId?: string;
    type?: string;
    limit?: number;
  }): Promise<
    Array<{
      id: string;
      title: string;
      isPromoted: boolean;
      campaignId: string;
    }>
  > {
    const query = new URLSearchParams();
    if (params?.cityId) query.set("cityId", params.cityId);
    if (params?.suburbId) query.set("suburbId", params.suburbId);
    if (params?.type) query.set("type", params.type);
    if (params?.limit) query.set("limit", String(params.limit));
    const queryString = query.toString();
    return this.client.get(
      `/ads/promoted${queryString ? `?${queryString}` : ""}`,
    );
  }
  // ========== INVOICES ==========

  async getMyInvoices(): Promise<AdvertiserInvoice[]> {
    return this.client.get("/ads/invoices/my");
  }

  async getInvoice(id: string): Promise<AdvertiserInvoice> {
    return this.client.get(`/ads/invoices/${id}`);
  }
}

export interface AdvertiserInvoice {
  id: string;
  advertiserId: string;
  purpose: string;
  currency: string;
  amountCents: number;
  status: "DRAFT" | "OPEN" | "PAID" | "VOID";
  issuedAt?: string;
  createdAt: string;
  lines?: Array<{
    description: string;
    amountCents: number;
    quantity: number;
  }>;
}
