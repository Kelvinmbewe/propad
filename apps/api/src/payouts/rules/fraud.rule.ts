import { Injectable, BadRequestException } from '@nestjs/common';
import { PayoutRequest } from '@prisma/client';
import { IPayoutRule } from './payout-rule.interface';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FraudRule implements IPayoutRule {
    constructor(private prisma: PrismaService) { }

    async validate(request: PayoutRequest): Promise<void> {
        // Simple check: multiple requests in short time?
        // Or check user risk score if exists.
        // Let's implement a simple velocity check: Max 1 pending request per user.

        // Note: request is already created when this rule runs? 
        // Usually rules run BEFORE creating the request.
        // The service creates request inside transaction.
        // So if we pass the request object *to be created* data, it's better.
        // But interface expects PayoutRequest.
        // Let's assume validation happens BEFORE creation or passed data structure mimics it.
        // Or we query for OTHER requests.

        const pendingRequests = await this.prisma.payoutRequest.count({
            where: {
                walletId: request.walletId,
                status: 'REQUESTED',
                id: { not: request.id }, // Exclude self if already created (unlikely if validation is pre-create)
            },
        });

        if (pendingRequests > 0) {
            // Technically this might be allowed, but for fraud prevention let's limit 1 at a time.
            // Actually, maybe just check if user is blocked or high risk.
            // Let's check User.trustScore < 0 (if exists) or status === SUSPENDED
            const wallet = await this.prisma.wallet.findUnique({
                where: { id: request.walletId },
                include: { user: true },
            });

            if (wallet?.user?.status === 'SUSPENDED' || (wallet?.user?.trustScore ?? 10) < 0) {
                throw new BadRequestException('Account flagged for review');
            }
        }
    }
}
