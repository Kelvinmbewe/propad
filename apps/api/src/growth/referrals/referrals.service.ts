import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { customAlphabet } from 'nanoid';
import { PricingService } from '../pricing/pricing.service';
import { LedgerService } from '../wallet/ledger.service';
import { WalletLedgerType, WalletLedgerSourceType } from '../wallet/enums';

@Injectable()
export class ReferralsService {
    private nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 6);

    constructor(
        private prisma: PrismaService,
        private pricingService: PricingService,
        private ledgerService: LedgerService
    ) { }

    async createMyCode(userId: string, prefix?: string) {
        // Check existing
        const existing = await this.prisma.referralCode.findFirst({ where: { ownerId: userId } });
        if (existing) return existing;

        const suffix = this.nanoid();
        const code = prefix ? `${prefix.toUpperCase().slice(0, 4)}-${suffix}` : `REF-${suffix}`;

        return this.prisma.referralCode.create({
            data: {
                code,
                ownerId: userId
            }
        });
    }

    async getMyCode(userId: string) {
        return this.createMyCode(userId); // Ensure one exists
    }

    async applyReferral(userId: string, code: string) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new BadRequestException('User not found');
        if (user.referredByCodeId) throw new BadRequestException('Already referred');

        const refCode = await this.prisma.referralCode.findUnique({ where: { code } });
        if (!refCode) throw new BadRequestException('Invalid code');
        if (refCode.ownerId === userId) throw new BadRequestException('Cannot refer yourself');

        // Link
        await this.prisma.user.update({
            where: { id: userId },
            data: { referredByCodeId: refCode.id }
        });

        await this.prisma.referralCode.update({
            where: { id: refCode.id },
            data: { usageCount: { increment: 1 } }
        });

        return { success: true };
    }

    // Called when a user does a qualifying action (e.g. verifying a property)
    async checkAndReward(userId: string, action: 'VERIFICATION' | 'FIRST_AD') {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { referredByCode: true }
        });
        if (!user || !user.referredByCode) return;

        // Check rules via PricingConfig
        // e.g. "REFERRAL_REWARD_VERIFICATION": 500
        const rewardAmount = await this.pricingService.getConfig(`REFERRAL_REWARD_${action}`, 0);

        if (rewardAmount > 0) {
            // Check if already rewarded for this specific action type if generic?
            // Simplified: Just credit the referrer.
            const referrerId = user.referredByCode.ownerId;
            const referrerWallet = await this.prisma.wallet.findFirst({ where: { ownerId: referrerId } });

            if (referrerWallet) {
                await this.ledgerService.recordTransaction(
                    referrerId,
                    rewardAmount,
                    WalletLedgerType.CREDIT,
                    WalletLedgerSourceType.REWARD,
                    `REF-ACT-${user.id}-${action}`, // Idempotency Key
                    referrerWallet.currency,
                    referrerWallet.id
                );
            }
        }
    }
}
