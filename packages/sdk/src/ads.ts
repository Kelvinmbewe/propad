export interface CreateCampaignDto {
    name: string;
    type: 'PROPERTY_BOOST' | 'BANNER' | 'SEARCH_SPONSOR';
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
    status?: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ENDED';
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
    type?: 'PROPERTY_BOOST' | 'BANNER' | 'SEARCH_SPONSOR';
    targetPropertyId?: string;
    budgetCents?: number;
    spentCents: number;
    dailyCapCents?: number;
    dailyCapImpressions?: number;
    startAt: string;
    endAt?: string;
    cpmUsdCents?: number;
    cpcUsdCents?: number;
    status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ENDED';
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
    constructor(private client: any) { }

    // ========== EXISTING ==========

    async getActive() {
        return this.client.get('/ads/active');
    }

    async getStats(id: string) {
        return this.client.get(`/ads/stats/${id}`);
    }

    // ========== CAMPAIGNS ==========

    async createCampaign(dto: CreateCampaignDto): Promise<Campaign> {
        return this.client.post('/ads/campaigns', dto);
    }

    async getMyCampaigns(): Promise<Campaign[]> {
        return this.client.get('/ads/campaigns/my');
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
        return this.client.get('/ads/analytics/summary');
    }

    async getAdminAnalytics(): Promise<any> {
        return this.client.get('/admin/ads/analytics');
    }

    // ========== BALANCE ==========

    async getBalance(): Promise<{ balanceCents: number }> {
        return this.client.get('/ads/balance');
    }

    async topUp(advertiserId: string, amountCents: number): Promise<{ balanceCents: number }> {
        return this.client.post(`/ads/topup/${advertiserId}`, { amountCents });
    }

    // ========== TRACKING ==========

    async trackImpression(dto: TrackImpressionDto): Promise<{ success: boolean; impressionId?: string; reason?: string }> {
        return this.client.post('/ads/track/impression', dto);
    }

    async trackClick(dto: TrackClickDto): Promise<{ success: boolean; clickId?: string; reason?: string }> {
        return this.client.post('/ads/track/click', dto);
    }

    // ========== PROMOTED LISTINGS ==========

    async getPromoted(params?: {
        cityId?: string;
        suburbId?: string;
        type?: string;
        limit?: number;
    }): Promise<Array<{ id: string; title: string; isPromoted: boolean; campaignId: string }>> {
        const query = new URLSearchParams();
        if (params?.cityId) query.set('cityId', params.cityId);
        if (params?.suburbId) query.set('suburbId', params.suburbId);
        if (params?.type) query.set('type', params.type);
        if (params?.limit) query.set('limit', String(params.limit));
        const queryString = query.toString();
        return this.client.get(`/ads/promoted${queryString ? `?${queryString}` : ''}`);
    }
}
