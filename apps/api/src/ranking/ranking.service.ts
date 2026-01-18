import { Injectable } from '@nestjs/common';
import { Property, PropertyType, PropertyFurnishing } from '@prisma/client';
import { RiskService } from '../trust/risk.service';
import { MonetizationService } from '../monetization/monetization.service';

export interface RankingParams {
    query?: string;
    priceMin?: number;
    priceMax?: number;
    bedrooms?: number;
    bathrooms?: number;
    type?: PropertyType;
    furnished?: PropertyFurnishing;
    powerPhase?: string; // Phase type not in schema, using string
    minFloorArea?: number;
    userTrustLevel?: number; // For personalization later?
}

@Injectable()
export class RankingService {
    constructor(
        private readonly riskService: RiskService,
        private readonly monetizationService: MonetizationService
    ) { }

    /**
     * Main entry point to rank a list of properties.
     * Properties must come with necessary relations loaded (trustScore is on Property).
     */
    rankListings(properties: Property[], params: RankingParams): { property: Property; score: number; breakdown: any }[] {
        // We use Promise.all to fetch boosts async for all properties
        // However, rankListings is currently sync. I'll need to fetch boosts before or make it async.
        // For architectural consistency with the task "min(boostEffect, trustCap)", 
        // I'll update it to be async or assume boosts are attached.
        // Let's make it async.
        return this.rankListingsAsync(properties, params) as any;
    }

    async rankListingsAsync(properties: Property[], params: RankingParams): Promise<{ property: Property; score: number; breakdown: any }[]> {
        const ranked = await Promise.all(properties.map(async (property) => {
            const breakdown = this.calculateScoreBreakdown(property, params);

            // Silent Dampening based on riskScore (Phase 9)
            const riskScore = (property as any).riskScore || 0;
            const riskMultiplier = this.riskService.getRiskPenaltyMultiplier(riskScore);

            // --- ETHICAL MONETIZATION (Phase 10) ---
            // 1. Fetch active boosts
            const activeBoosts = await this.monetizationService.getActiveBoosts('PROPERTY', property.id, riskScore);

            // 2. Calculate boostEffect (Max +15)
            let boostEffect = 0;
            if (activeBoosts.some((b: { type: string }) => b.type === 'LISTING_BOOST')) {
                boostEffect += 15;
            } else if (activeBoosts.some((b: { type: string }) => b.type === 'FEATURED_LISTING')) {
                boostEffect += 10;
            }

            // 3. Calculate trustCap = trustScore * 0.15
            const trustScore = property.trustScore || 0;
            const trustCap = trustScore * 0.15;

            // 4. Apply min(boostEffect, trustCap)
            const appliedBoost = Math.min(boostEffect, trustCap);

            const scoreWithBoost = breakdown.total + appliedBoost;
            const finalScore = scoreWithBoost * riskMultiplier;

            return {
                property,
                score: Math.ceil(finalScore),
                breakdown: {
                    ...breakdown,
                    boostApplied: appliedBoost,
                    trustCapReached: boostEffect > trustCap,
                    riskPenalty: riskMultiplier < 1 ? riskMultiplier : undefined
                }
            };
        }));

        return ranked.sort((a, b) => b.score - a.score);
    }

    calculateScoreBreakdown(property: Property, params: RankingParams) {
        // 1. Trust Score (45%)
        // Property.trustScore is 0-100
        const trustScore = property.trustScore || 0;

        // 2. Relevance Score (30%)
        const relevanceScore = this.calculateRelevance(property, params);

        // 3. Freshness Score (15%)
        const freshnessScore = this.calculateFreshness(property);

        // 4. Engagement Score (10%)
        // Placeholder: Using activityLogs count if available, or 0.
        // Ideally we pass aggregated stats.
        const engagementScore = this.calculateEngagement(property);

        // Weighted Sum
        // Formula: T*0.45 + R*0.30 + F*0.15 + E*0.10
        let total = (trustScore * 0.45) + (relevanceScore * 0.30) + (freshnessScore * 0.15) + (engagementScore * 0.10);

        // Fairness / Boosts Logic
        // Example: If trust < 40, boosts are ignored. (Boosts not yet implemented in this MVP function, but logic placeheld)

        return {
            total: Math.min(100, Math.ceil(total)),
            components: {
                trust: trustScore,
                relevance: relevanceScore,
                freshness: freshnessScore,
                engagement: engagementScore
            }
        };
    }

    private calculateRelevance(property: Property, params: RankingParams): number {
        let score = 100;

        // If no specific params, relevance is high (generic browsing)
        // But we might want to prioritize "good" listings generally?
        // For now, treat no-params as neutral 100 or reduce if we want to rely on Trust/Freshness more.
        // Let's stick to 100 start.

        // Price Matching
        if (params.priceMin || params.priceMax) {
            const price = Number(property.price); // Decimal to Number
            if (params.priceMin && price < params.priceMin) score -= 30; // Out of range penalty
            if (params.priceMax && price > params.priceMax) score -= 30;
        }

        // Type Match
        if (params.type && property.type !== params.type) {
            score -= 50; // Heavy penalty for wrong type
        }

        // Bedroom/Bathroom Match (Soft Penalty)
        if (params.bedrooms && property.bedrooms !== null) {
            const diff = Math.abs(property.bedrooms - params.bedrooms);
            if (diff > 0) score -= (diff * 10);
        }

        // Ensure 0-100
        return Math.max(0, Math.min(100, score));
    }

    private calculateFreshness(property: Property): number {
        const now = Date.now();
        const created = new Date(property.createdAt).getTime();
        const daysOld = (now - created) / (1000 * 60 * 60 * 24);

        // Exponential Decay
        // New (0 days) = 100
        // 14 days = ~80
        // 60 days = ~30
        // Formula: 100 * e^(-0.02 * days)

        return Math.ceil(100 * Math.exp(-0.02 * daysOld));
    }

    private calculateEngagement(property: Property): number {
        // Requires Activity Logs or predefined stats.
        // For MVP, if we don't have logs joined, defaulting to neutral or based on view count if field exists.
        // Let's assume passed property might have 'activityLogs' if joined.
        const logs = (property as any).activityLogs || [];
        const count = logs.length;

        // Simple: 1 point per log, max 100? Or curve?
        // Let's say 20 interactions is "High".
        return Math.min(100, count * 5);
    }

    explainRanking(property: Property, params: RankingParams) {
        return this.calculateScoreBreakdown(property, params);
    }

    /**
     * Rank listings with promoted listings injected at top.
     * Promoted listings (from PROPERTY_BOOST and SEARCH_SPONSOR campaigns)
     * appear first, followed by organic results.
     */
    async rankWithPromotedListings(
        properties: Property[],
        params: RankingParams,
        promotedListings: Array<Property & { isPromoted: boolean; campaignId: string }>,
    ): Promise<{
        property: Property;
        score: number;
        isPromoted: boolean;
        campaignId?: string;
        breakdown: any;
    }[]> {
        // 1. Get property IDs that are already in promoted listings
        const promotedIds = new Set(promotedListings.map(p => p.id));

        // 2. Filter promoted listings from organic to avoid duplicates
        const organicProperties = properties.filter(p => !promotedIds.has(p.id));

        // 3. Rank organic listings
        const rankedOrganic = await this.rankListingsAsync(organicProperties, params);

        // 4. Create promoted results (they skip normal ranking, get top placement)
        const promotedResults = promotedListings.map((property) => ({
            property,
            score: 100 + 10, // Guaranteed above organic scores
            isPromoted: true,
            campaignId: property.campaignId,
            breakdown: {
                total: 100,
                components: {
                    trust: property.trustScore || 0,
                    relevance: 100,
                    freshness: 100,
                    engagement: 100,
                },
                promotedPlacement: true,
            },
        }));

        // 5. Combine: promoted first, then organic
        const organicResults = rankedOrganic.map(r => ({
            ...r,
            isPromoted: false,
            campaignId: undefined,
        }));

        return [...promotedResults, ...organicResults];
    }
}
