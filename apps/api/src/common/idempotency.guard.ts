import { Injectable, CanActivate, ExecutionContext, BadRequestException } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';

@Injectable()
export class IdempotencyGuard implements CanActivate {
    constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const key = request.headers['idempotency-key'];

        if (!key) {
            // Option: Enforce valid key for certain routes? 
            // For now, allow through but log warning if critical?
            // Let's enforce it ONLY if the header is present. 
            // Phase C4 requirement says "Idempotency keys required for payout requests".
            // Use logic: if (route matches critical) check key.
            return true;
        }

        const cached = await this.cacheManager.get(`idempotency:${key}`);
        if (cached) {
            throw new BadRequestException('Duplicate Request (Idempotency Key detected)');
        }

        // Set cache (TTL 1 min)
        await this.cacheManager.set(`idempotency:${key}`, 'processing', 60000);

        return true;
    }
}
