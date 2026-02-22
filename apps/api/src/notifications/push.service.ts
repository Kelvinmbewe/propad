import { Injectable, Logger } from '@nestjs/common';

/**
 * Push notification service (stub)
 * 
 * Note: The PushToken model doesn't exist in the schema yet.
 * This is a placeholder that logs push notifications. To enable push notifications:
 * 1. Add PushToken model to the Prisma schema
 * 2. Generate the Prisma client
 * 3. Implement the actual push logic
 */
@Injectable()
export class PushService {
    private readonly logger = new Logger(PushService.name);

    async registerToken(userId: string, deviceId: string, platform: string, token: string) {
        // TODO: Implement when PushToken model is added to schema
        this.logger.log(`[MOCK] Registering push token for user ${userId}, device ${deviceId}`);
        return { userId, deviceId, platform, token };
    }

    async unregisterToken(deviceId: string) {
        // TODO: Implement when PushToken model is added to schema
        this.logger.log(`[MOCK] Unregistering push token for device ${deviceId}`);
        return { count: 0 };
    }

    async sendToUser(userId: string, title: string, body: string, data?: any) {
        // TODO: Implement when PushToken model is added to schema
        this.logger.log(`[MOCK PUSH] Sending to User ${userId}: ${title} - ${body}`);
    }
}
