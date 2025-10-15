import { Injectable } from '@nestjs/common';
import { env } from '@propad/config';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAdImpressionDto } from './dto/create-ad-impression.dto';

@Injectable()
export class AdsService {
  constructor(private readonly prisma: PrismaService) {}

  async logImpression(payload: CreateAdImpressionDto) {
    const estimatedRevenue =
      payload.revenueMicros ??
      this.simulateRevenueMicros(payload.route, payload.sessionId);

    return this.prisma.adImpression.create({
      data: {
        propertyId: payload.propertyId,
        userId: payload.userId,
        route: payload.route,
        source: payload.source,
        sessionId: payload.sessionId,
        revenueMicros: estimatedRevenue
      }
    });
  }

  private simulateRevenueMicros(route: string, sessionId: string) {
    if (process.env.NODE_ENV === 'production') {
      return 0;
    }

    const hashInput = `${route}:${sessionId}:${env.WEB_ORIGIN ?? 'dev'}`;
    let hash = 0;
    for (let i = 0; i < hashInput.length; i += 1) {
      hash = (hash << 5) - hash + hashInput.charCodeAt(i);
      hash |= 0;
    }

    const base = 200_000;
    const variance = Math.abs(hash) % 120_000;
    return base + variance;
  }
}
