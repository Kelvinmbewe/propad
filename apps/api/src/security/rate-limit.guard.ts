import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class RateLimitGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const ip =
      req.ip ||
      (Array.isArray(req.ips) && req.ips.length > 0 ? req.ips[0] : undefined) ||
      req.headers['x-forwarded-for'] ||
      req.connection?.remoteAddress ||
      'unknown';
    const userId = req.user?.userId ?? 'anon';
    return `${ip}:${userId}`;
  }

  protected getRequestResponse(context: ExecutionContext) {
    const { req, res } = super.getRequestResponse(context);
    return { req, res };
  }
}
