import { Injectable, Logger, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FeatureFlagsService {
    private readonly logger = new Logger(FeatureFlagsService.name);

    constructor(
        private readonly prisma: PrismaService,
        @Inject(CACHE_MANAGER) private cacheManager: Cache
    ) { }

    async getFlag(key: string, defaultValue = false): Promise<boolean> {
        const cached = await this.cacheManager.get<boolean>(`flag:${key}`);
        if (cached !== undefined) {
            return cached;
        }

        const flag = await this.prisma.featureFlag.findUnique({
            where: { key }
        });

        const value = flag ? flag.enabled : defaultValue;
        await this.cacheManager.set(`flag:${key}`, value, 300000); // Cache for 5 mins
        return value;
    }

    async setFlag(key: string, enabled: boolean) {
        await this.prisma.featureFlag.upsert({
            where: { key },
            update: { enabled },
            create: { key, enabled }
        });
        await this.cacheManager.del(`flag:${key}`);
        this.logger.log(`Feature Flag '${key}' set to ${enabled}`);
    }

    async getAllFlags() {
        return this.prisma.featureFlag.findMany();
    }
}
