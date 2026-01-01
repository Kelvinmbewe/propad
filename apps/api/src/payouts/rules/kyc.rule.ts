import { Injectable, BadRequestException } from '@nestjs/common';
import { PayoutRequest } from '@prisma/client';
import { IPayoutRule } from './payout-rule.interface';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class KycRule implements IPayoutRule {
    constructor(private prisma: PrismaService) { }

    async validate(request: PayoutRequest): Promise<void> {
        const wallet = await this.prisma.wallet.findUnique({
            where: { id: request.walletId },
            include: { user: true },
        });

        if (!wallet || !wallet.user) {
            throw new BadRequestException('Wallet owner not found');
        }

        // Check if verified. Assuming isVerified or kycStatus on User.
        if (!wallet.user.isVerified) {
            throw new BadRequestException('User must be verified to request payouts');
        }
    }
}
