import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RiskService {
    private readonly logger = new Logger(RiskService.name);

    constructor(private prisma: PrismaService) { }

    async logEvent(
        userId: string | undefined,
        type: string,
        severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
        metadata?: any,
        ipAddress?: string,
        userAgent?: string
    ) {
        try {
            await this.prisma.riskEvent.create({
                data: {
                    userId,
                    type,
                    severity,
                    metadata: metadata ?? {},
                    ipAddress,
                    userAgent
                }
            });
            if (severity === 'CRITICAL' || severity === 'HIGH') {
                this.logger.warn(`Risk Event: [${severity}] ${type} User:${userId}`);
            }
        } catch (error) {
            this.logger.error(`Failed to log risk event: ${error}`);
        }
    }

    async getRecentEvents(limit: number = 50) {
        return this.prisma.riskEvent.findMany({
            orderBy: { createdAt: 'desc' },
            take: limit,
            include: { user: { select: { email: true, id: true } } }
        });
    }
}
