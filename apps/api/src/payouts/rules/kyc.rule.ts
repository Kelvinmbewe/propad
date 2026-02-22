import { Injectable, BadRequestException } from '@nestjs/common';
import { PayoutRequest, OwnerType } from '@prisma/client';
import { IPayoutRule } from './payout-rule.interface';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class KycRule implements IPayoutRule {
    constructor(private prisma: PrismaService) { }

    async validate(request: PayoutRequest): Promise<void> {
        const wallet = await this.prisma.wallet.findUnique({
            where: { id: request.walletId },
        });

        if (!wallet) {
            throw new BadRequestException('Wallet not found');
        }

        // Check if owner is a USER - only then check verification status
        if (wallet.ownerType === OwnerType.USER) {
            const user = await this.prisma.user.findUnique({
                where: { id: wallet.ownerId },
                select: { isVerified: true }
            });

            if (!user) {
                throw new BadRequestException('Wallet owner not found');
            }

            // Check if verified. Assuming isVerified or kycStatus on User.
            if (!user.isVerified) {
                throw new BadRequestException('User must be verified to request payouts');
            }
        }
    }
}
