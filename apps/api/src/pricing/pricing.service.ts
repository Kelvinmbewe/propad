import { Injectable, Logger, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PricingService {
    private readonly logger = new Logger(PricingService.name);

    constructor(
        private readonly prisma: PrismaService,
        @Inject(CACHE_MANAGER) private cacheManager: Cache
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

    async setConfig(key: string, value: any, description?: string) {
        await this.prisma.pricingConfig.upsert({
            where: { key },
            update: { value, description },
            create: { key, value, description }
        });
        await this.cacheManager.del(`pricing:${key}`);
        this.logger.log(`Pricing Config '${key}' updated`);
    }

    async getAllConfigs() {
        return this.prisma.pricingConfig.findMany({
            orderBy: { key: 'asc' }
        });
    }
}
