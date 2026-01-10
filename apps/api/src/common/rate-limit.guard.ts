import {
    Injectable,
    CanActivate,
    ExecutionContext,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IncentiveRateLimitService } from './incentive-rate-limit.service';

export const RATE_LIMIT_OPERATION_KEY = 'rateLimit:operation';
export const RATE_LIMIT_KEY_SOURCE_KEY = 'rateLimit:keySource';

type KeySource = 'user' | 'param' | 'body' | 'global';

/**
 * Decorator to apply rate limiting to an endpoint
 */
export function RateLimit(
    operation: string,
    keySource: KeySource = 'user',
    keyField?: string
) {
    return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
        Reflect.defineMetadata(RATE_LIMIT_OPERATION_KEY, operation, descriptor.value);
        Reflect.defineMetadata(
            RATE_LIMIT_KEY_SOURCE_KEY,
            { source: keySource, field: keyField },
            descriptor.value
        );
        return descriptor;
    };
}

@Injectable()
export class RateLimitGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly rateLimitService: IncentiveRateLimitService
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const operation = this.reflector.get<string>(
            RATE_LIMIT_OPERATION_KEY,
            context.getHandler()
        );

        if (!operation) {
            return true;
        }

        const keyConfig = this.reflector.get<{ source: KeySource; field?: string }>(
            RATE_LIMIT_KEY_SOURCE_KEY,
            context.getHandler()
        );

        const request = context.switchToHttp().getRequest();
        let key: string;

        switch (keyConfig.source) {
            case 'user':
                key = request.user?.id || 'anonymous';
                break;
            case 'param':
                key = request.params?.[keyConfig.field || 'id'] || 'unknown';
                break;
            case 'body':
                key = request.body?.[keyConfig.field || 'id'] || 'unknown';
                break;
            case 'global':
                key = 'global';
                break;
            default:
                key = 'unknown';
        }

        await this.rateLimitService.enforceRateLimit(operation as any, key);
        return true;
    }
}
