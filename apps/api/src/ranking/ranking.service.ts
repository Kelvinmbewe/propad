import { Injectable } from '@nestjs/common';
import { Property, PropertyType, PropertyFurnishing, PowerPhase } from '@prisma/client';
import { RiskService } from '../trust/risk.service';

export interface RankingParams {
    query?: string;
    priceMin?: number;
    priceMax?: number;
    bedrooms?: number;
    bathrooms?: number;
    type?: PropertyType;
    furnished?: PropertyFurnishing;
    powerPhase?: PowerPhase;
    minFloorArea?: number;
    userTrustLevel?: number; // For personalization later?
}

@Injectable()
export class RankingService {
    constructor(private readonly riskService: RiskService) { }

    /**
     * Main entry point to rank a list of properties.
     * Properties must come with necessary relations loaded (trustScore is on Property).
     */
    rankListings(properties: Property[], params: RankingParams): { property: Property; score: number; breakdown: any }[] {
        return properties.map(property => {
            const breakdown = this.calculateScoreBreakdown(property, params);

            // Silent Dampening based on riskScore
            const riskScore = (property as any).riskScore || 0;
            const multiplier = this.riskService.getRiskPenaltyMultiplier(riskScore);

            const finalScore = breakdown.total * multiplier;

            return {
                property,
                score: Math.ceil(finalScore),
                breakdown: {
                    ...breakdown,
                    riskPenalty: multiplier < 1 ? multiplier : undefined
                }
            };
        }).sort((a, b) => b.score - a.score);
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
}
