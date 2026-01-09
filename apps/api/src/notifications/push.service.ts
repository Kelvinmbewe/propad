import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PushService {
    private readonly logger = new Logger(PushService.name);

    constructor(private prisma: PrismaService) { }

    async registerToken(userId: string, deviceId: string, platform: string, token: string) {
        return this.prisma.pushToken.upsert({
            where: { deviceId },
            update: { userId, token, lastSeenAt: new Date() },
            create: { userId, deviceId, platform, token }
        });
    }

    async unregisterToken(deviceId: string) {
        return this.prisma.pushToken.deleteMany({ where: { deviceId } });
    }

    async sendToUser(userId: string, title: string, body: string, data?: any) {
        const tokens = await this.prisma.pushToken.findMany({ where: { userId } });
        if (tokens.length === 0) return;

        this.logger.log(`[MOCK PUSH] Sending to ${tokens.length} devices for User ${userId}: ${title} - ${body}`);
        // In real impl: Iterate platform (FCM/APNS) and send.
    }
}
