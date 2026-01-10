import { Injectable, Logger, Inject, ForbiddenException, BadRequestException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

export interface ConfigLockInfo {
    isLocked: boolean;
    lockedAt?: Date;
    approvalRequired: boolean;
}

@Injectable()
export class PricingService {
    private readonly logger = new Logger(PricingService.name);

    constructor(
        private readonly prisma: PrismaService,
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
        private readonly audit: AuditService
    ) { }

    async getConfig<T>(key: string, defaultValue: T): Promise<T> {
        const cached = await this.cacheManager.get<T>(`pricing:${key}`);
        if (cached !== undefined && cached !== null) {
            return cached;
        }

        const config = await this.prisma.pricingConfig.findUnique({
            where: { key }
        });

        if (!config || !config.enabled) {
            return defaultValue;
        }

        const value = config.value as T;
        // Cache for 10 minutes, but we invalidate on set
        await this.cacheManager.set(`pricing:${key}`, value, 600000);
        return value;
    }

    /**
     * Get config value at a specific point in time (for historical/audit purposes)
     */
    async getConfigAtTime<T>(key: string, timestamp: Date, defaultValue: T): Promise<T> {
        const version = await this.prisma.pricingConfigVersion.findFirst({
            where: {
                key,
                effectiveFrom: { lte: timestamp },
                OR: [
                    { effectiveTo: null },
                    { effectiveTo: { gt: timestamp } }
                ]
            },
            orderBy: { effectiveFrom: 'desc' }
        });

        if (!version || !version.enabled) {
            return defaultValue;
        }

        return version.value as T;
    }

    /**
     * Check if a config key is locked
     */
    async getConfigLockInfo(key: string): Promise<ConfigLockInfo> {
        const latestVersion = await this.prisma.pricingConfigVersion.findFirst({
            where: { key },
            orderBy: { version: 'desc' }
        });

        if (!latestVersion) {
            return { isLocked: false, approvalRequired: false };
        }

        return {
            isLocked: !!latestVersion.lockedAt,
            lockedAt: latestVersion.lockedAt || undefined,
            approvalRequired: !!latestVersion.lockedAt
        };
    }

    /**
     * Standard config update (fails if locked)
     */
    async setConfig(key: string, value: any, description?: string) {
        // Check if locked
        const lockInfo = await this.getConfigLockInfo(key);
        if (lockInfo.isLocked) {
            throw new ForbiddenException(
                `Config '${key}' is locked. Use setConfigWithApproval() instead.`
            );
        }

        await this.prisma.pricingConfig.upsert({
            where: { key },
            update: { value, description },
            create: { key, value, description }
        });
        await this.cacheManager.del(`pricing:${key}`);
        this.logger.log(`Pricing Config '${key}' updated`);
    }

    /**
     * Set config with approval (for locked configs)
     */
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

        const now = new Date();

        // Get current version number
        const latestVersion = await this.prisma.pricingConfigVersion.findFirst({
            where: { key },
            orderBy: { version: 'desc' }
        });
        const nextVersion = (latestVersion?.version || 0) + 1;

        // Close previous version
        if (latestVersion) {
            await this.prisma.pricingConfigVersion.update({
                where: { id: latestVersion.id },
                data: { effectiveTo: now }
            });
        }

        // Create new version
        await this.prisma.pricingConfigVersion.create({
            data: {
                key,
                value,
                description,
                version: nextVersion,
                effectiveFrom: now,
                approvedById: approverId,
                approvedAt: now,
                lockedAt: latestVersion?.lockedAt || null,
                auditReason
            }
        });

        // Update current config
        await this.prisma.pricingConfig.upsert({
            where: { key },
            update: { value, description },
            create: { key, value, description }
        });

        await this.cacheManager.del(`pricing:${key}`);

        await this.audit.logAction({
            action: 'CONFIG_MODIFIED_WITH_APPROVAL',
            actorId: approverId,
            targetType: 'PricingConfig',
            targetId: key,
            metadata: {
                version: nextVersion,
                auditReason,
                previousValue: latestVersion?.value
            }
        });

        this.logger.log(`Pricing Config '${key}' updated with approval v${nextVersion}`);
    }

    /**
     * Lock a config key (requires approval for future changes)
     */
    async lockConfig(key: string, lockerId: string, auditReason: string): Promise<void> {
        if (!auditReason || auditReason.trim().length < 10) {
            throw new BadRequestException('Audit reason must be at least 10 characters');
        }

        const config = await this.prisma.pricingConfig.findUnique({ where: { key } });
        if (!config) {
            throw new BadRequestException(`Config '${key}' does not exist`);
        }

        const now = new Date();

        // Get or create version
        const latestVersion = await this.prisma.pricingConfigVersion.findFirst({
            where: { key },
            orderBy: { version: 'desc' }
        });

        if (latestVersion) {
            await this.prisma.pricingConfigVersion.update({
                where: { id: latestVersion.id },
                data: { lockedAt: now }
            });
        } else {
            // Create initial version with lock
            await this.prisma.pricingConfigVersion.create({
                data: {
                    key,
                    value: config.value,
                    description: config.description,
                    version: 1,
                    effectiveFrom: config.createdAt,
                    lockedAt: now,
                    auditReason
                }
            });
        }

        await this.audit.logAction({
            action: 'CONFIG_LOCKED',
            actorId: lockerId,
            targetType: 'PricingConfig',
            targetId: key,
            metadata: { auditReason }
        });

        this.logger.log(`Pricing Config '${key}' locked`);
    }

    /**
     * Get version history for a config key
     */
    async getConfigHistory(key: string, limit: number = 20) {
        return this.prisma.pricingConfigVersion.findMany({
            where: { key },
            orderBy: { version: 'desc' },
            take: limit
        });
    }

    async getAllConfigs() {
        return this.prisma.pricingConfig.findMany({
            orderBy: { key: 'asc' }
        });
    }
}

