import { Injectable, Logger, Inject, ForbiddenException, BadRequestException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ChargeableItemType } from '@propad/config';

export interface ConfigLockInfo {
    isLocked: boolean;
    lockedAt?: Date;
    approvalRequired: boolean;
}

export interface PriceResult {
    basePriceCents: number;
    platformFeeCents: number;
    commissionCents: number;
    agentShareCents: number;
    referralShareCents: number;
    rewardPoolShareCents: number;
    totalCents: number;
}

// Default pricing configuration - matches ChargeableItemType enum values
const DEFAULT_PRICING: Record<ChargeableItemType, {
    basePriceCents: number;
    platformFeePercent: number;
    commissionPercent: number;
    agentSharePercent: number;
    referralSharePercent: number;
    rewardPoolSharePercent: number;
}> = {
    [ChargeableItemType.FEATURE]: {
        basePriceCents: 500,
        platformFeePercent: 10,
        commissionPercent: 0,
        agentSharePercent: 70,
        referralSharePercent: 5,
        rewardPoolSharePercent: 5
    },
    [ChargeableItemType.BOOST]: {
        basePriceCents: 1000,
        platformFeePercent: 10,
        commissionPercent: 0,
        agentSharePercent: 0,
        referralSharePercent: 5,
        rewardPoolSharePercent: 5
    },
    [ChargeableItemType.SUBSCRIPTION]: {
        basePriceCents: 2000,
        platformFeePercent: 15,
        commissionPercent: 0,
        agentSharePercent: 60,
        referralSharePercent: 5,
        rewardPoolSharePercent: 5
    },
    [ChargeableItemType.OTHER]: {
        basePriceCents: 1000,
        platformFeePercent: 5,
        commissionPercent: 0,
        agentSharePercent: 0,
        referralSharePercent: 5,
        rewardPoolSharePercent: 5
    }
};

/**
 * Pricing Service
 * 
 * Note: The pricingConfig and pricingConfigVersion models don't exist in the current Prisma schema.
 * This service uses in-memory configuration instead.
 */
@Injectable()
export class PricingService {
    private readonly logger = new Logger(PricingService.name);
    private readonly configCache = new Map<string, any>();

    constructor(
        private readonly prisma: PrismaService,
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
        private readonly audit: AuditService
    ) { }

    async getConfig<T>(key: string, defaultValue: T): Promise<T> {
        // Check memory cache first
        if (this.configCache.has(key)) {
            return this.configCache.get(key) as T;
        }

        // Check app config
        const config = await this.prisma.appConfig.findUnique({
            where: { key: `pricing:${key}` }
        });

        if (!config) {
            return defaultValue;
        }

        const value = config.jsonValue as T;
        this.configCache.set(key, value);
        return value;
    }

    async getConfigAtTime<T>(key: string, timestamp: Date, defaultValue: T): Promise<T> {
        // Without versioning model, just return current config
        return this.getConfig(key, defaultValue);
    }

    async getConfigLockInfo(key: string): Promise<ConfigLockInfo> {
        // Without versioning model, configs are never locked
        return { isLocked: false, approvalRequired: false };
    }

    async setConfig(key: string, value: any, description?: string) {
        // Check if locked
        const lockInfo = await this.getConfigLockInfo(key);
        if (lockInfo.isLocked) {
            throw new ForbiddenException(
                `Config '${key}' is locked. Use setConfigWithApproval() instead.`
            );
        }

        await this.prisma.appConfig.upsert({
            where: { key: `pricing:${key}` },
            update: { jsonValue: value },
            create: { key: `pricing:${key}`, jsonValue: value }
        });
        this.configCache.delete(key);
        this.logger.log(`Pricing Config '${key}' updated`);
    }

    async setConfigWithApproval(
        key: string,
        value: any,
        approverId: string,
        auditReason: string,
        description?: string
    ): Promise<void> {
        if (!auditReason || auditReason.trim().length < 10) {
            throw new BadRequestException('Audit reason must be at least 10 characters');
        }

        await this.prisma.appConfig.upsert({
            where: { key: `pricing:${key}` },
            update: { jsonValue: value },
            create: { key: `pricing:${key}`, jsonValue: value }
        });
        this.configCache.delete(key);

        await this.audit.logAction({
            action: 'CONFIG_MODIFIED_WITH_APPROVAL',
            actorId: approverId,
            targetType: 'PricingConfig',
            targetId: key,
            metadata: {
                auditReason
            }
        });

        this.logger.log(`Pricing Config '${key}' updated with approval`);
    }

    async lockConfig(key: string, lockerId: string, auditReason: string): Promise<void> {
        // Without versioning model, this is a no-op
        this.logger.log(`[STUB] Locking config '${key}' is not implemented`);
    }

    async getConfigHistory(key: string, limit: number = 20) {
        // Without versioning model, return empty array
        return [];
    }

    async getAllConfigs() {
        const configs = await this.prisma.appConfig.findMany({
            where: { key: { startsWith: 'pricing:' } },
            orderBy: { key: 'asc' }
        });
        return configs.map(c => ({
            key: c.key.replace('pricing:', ''),
            value: c.jsonValue,
            enabled: true
        }));
    }

    /**
     * Calculate the price breakdown for a chargeable item
     */
    async calculatePrice(itemType: ChargeableItemType): Promise<PriceResult> {
        // Get default config
        const config = DEFAULT_PRICING[itemType];

        if (!config) {
            throw new BadRequestException(`Unknown chargeable item type: ${itemType}`);
        }

        // Try to get override from database
        const override = await this.getConfig<typeof config | null>(`item:${itemType}`, null);
        const finalConfig = override || config;

        const basePriceCents = finalConfig.basePriceCents || 0;
        const platformFeePercent = finalConfig.platformFeePercent || 10;
        const commissionPercent = finalConfig.commissionPercent || 0;
        const agentSharePercent = finalConfig.agentSharePercent || 0;
        const referralSharePercent = finalConfig.referralSharePercent || 0;
        const rewardPoolSharePercent = finalConfig.rewardPoolSharePercent || 0;

        const platformFeeCents = Math.round(basePriceCents * platformFeePercent / 100);
        const commissionCents = Math.round(basePriceCents * commissionPercent / 100);
        const agentShareCents = Math.round(basePriceCents * agentSharePercent / 100);
        const referralShareCents = Math.round(basePriceCents * referralSharePercent / 100);
        const rewardPoolShareCents = Math.round(basePriceCents * rewardPoolSharePercent / 100);

        return {
            basePriceCents,
            platformFeeCents,
            commissionCents,
            agentShareCents,
            referralShareCents,
            rewardPoolShareCents,
            totalCents: basePriceCents
        };
    }
}
