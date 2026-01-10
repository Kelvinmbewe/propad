import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface RateLimitConfig {
    maxRequests: number;
    windowMs: number; // milliseconds
    cooldownMs?: number; // cooldown between successful operations
}

interface RateLimitEntry {
    count: number;
    windowStart: number;
    lastSuccess?: number;
}

/**
 * Rate limit configurations for incentive operations
 */
const RATE_LIMITS: Record<string, RateLimitConfig> = {
    // Admin operations
    REWARD_RECALCULATION: {
        maxRequests: 10,
        windowMs: 60 * 60 * 1000, // 10 per hour per admin
    },
    MANUAL_PAYOUT: {
        maxRequests: 50,
        windowMs: 60 * 60 * 1000, // 50 per hour per admin
    },
    REFERRAL_RESOLUTION: {
        maxRequests: 100,
        windowMs: 60 * 1000, // 100 per minute globally
    },
    // Cooldowns for incentive-triggering events
    DEAL_REWARD: {
        maxRequests: 1,
        windowMs: 24 * 60 * 60 * 1000, // 1 per day per property
        cooldownMs: 24 * 60 * 60 * 1000,
    },
    REFERRAL_REWARD: {
        maxRequests: 1,
        windowMs: 60 * 60 * 1000, // 1 per hour per user
        cooldownMs: 60 * 60 * 1000,
    },
};

@Injectable()
export class IncentiveRateLimitService {
    private readonly logger = new Logger(IncentiveRateLimitService.name);

    // In-memory rate limit tracking (use Redis in production for distributed)
    private rateLimitMap: Map<string, RateLimitEntry> = new Map();

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Check if an operation is within rate limits
     */
    async checkRateLimit(
        operation: keyof typeof RATE_LIMITS,
        key: string // userId or entityId
    ): Promise<{ allowed: boolean; retryAfterMs?: number }> {
        const config = RATE_LIMITS[operation];
        if (!config) {
            return { allowed: true };
        }

        const cacheKey = `${operation}:${key}`;
        const now = Date.now();
        const entry = this.rateLimitMap.get(cacheKey);

        // Check cooldown
        if (config.cooldownMs && entry?.lastSuccess) {
            const timeSinceSuccess = now - entry.lastSuccess;
            if (timeSinceSuccess < config.cooldownMs) {
                return {
                    allowed: false,
                    retryAfterMs: config.cooldownMs - timeSinceSuccess,
                };
            }
        }

        // Check sliding window
        if (!entry || now - entry.windowStart > config.windowMs) {
            // Window expired, reset
            this.rateLimitMap.set(cacheKey, { count: 1, windowStart: now });
            return { allowed: true };
        }

        if (entry.count >= config.maxRequests) {
            const retryAfterMs = config.windowMs - (now - entry.windowStart);
            return { allowed: false, retryAfterMs };
        }

        // Increment count
        entry.count++;
        this.rateLimitMap.set(cacheKey, entry);
        return { allowed: true };
    }

    /**
     * Record a successful operation (for cooldown tracking)
     */
    recordSuccess(operation: keyof typeof RATE_LIMITS, key: string): void {
        const cacheKey = `${operation}:${key}`;
        const entry = this.rateLimitMap.get(cacheKey);

        if (entry) {
            entry.lastSuccess = Date.now();
            this.rateLimitMap.set(cacheKey, entry);
        }
    }

    /**
     * Enforce rate limit and throw if exceeded
     */
    async enforceRateLimit(
        operation: keyof typeof RATE_LIMITS,
        key: string
    ): Promise<void> {
        const result = await this.checkRateLimit(operation, key);

        if (!result.allowed) {
            const retryAfterSeconds = Math.ceil((result.retryAfterMs || 0) / 1000);
            this.logger.warn(
                `Rate limit exceeded for ${operation}:${key}, retry after ${retryAfterSeconds}s`
            );
            throw new HttpException(
                {
                    message: `Rate limit exceeded for ${operation}. Please try again later.`,
                    retryAfterSeconds,
                },
                HttpStatus.TOO_MANY_REQUESTS
            );
        }
    }

    /**
     * Get remaining quota for an operation
     */
    async getRemainingQuota(
        operation: keyof typeof RATE_LIMITS,
        key: string
    ): Promise<{ remaining: number; resetIn: number }> {
        const config = RATE_LIMITS[operation];
        if (!config) {
            return { remaining: -1, resetIn: 0 };
        }

        const cacheKey = `${operation}:${key}`;
        const now = Date.now();
        const entry = this.rateLimitMap.get(cacheKey);

        if (!entry || now - entry.windowStart > config.windowMs) {
            return { remaining: config.maxRequests, resetIn: 0 };
        }

        return {
            remaining: Math.max(0, config.maxRequests - entry.count),
            resetIn: Math.max(0, config.windowMs - (now - entry.windowStart)),
        };
    }

    /**
     * Clear rate limits (for testing/admin purposes)
     */
    clearRateLimits(operation?: string, key?: string): void {
        if (operation && key) {
            this.rateLimitMap.delete(`${operation}:${key}`);
        } else if (operation) {
            for (const k of this.rateLimitMap.keys()) {
                if (k.startsWith(`${operation}:`)) {
                    this.rateLimitMap.delete(k);
                }
            }
        } else {
            this.rateLimitMap.clear();
        }
    }
}
