import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { customAlphabet } from 'nanoid';
import { PricingService } from '../../pricing/pricing.service';
import { RewardsService } from '../../rewards/rewards.service';
import {
    ReferralStatus,
    ReferralSource,
    Currency,
    Role
} from '@prisma/client';

@Injectable()
export class ReferralsService {
    private readonly logger = new Logger(ReferralsService.name);
    private nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 6);

    constructor(
        private prisma: PrismaService,
        private pricingService: PricingService,
        private rewardsService: RewardsService
    ) { }

    /**
     * Ensure user has a referral code
     */
    async getOrCreateMyCode(userId: string, prefix?: string) {
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

    /**
     * Called during User Registration
     */
    async trackSignup(params: {
        userId: string,
        referralCode: string,
        ipAddress?: string,
        deviceId?: string
    }) {
        const { userId, referralCode, ipAddress, deviceId } = params;

        // 1. Validate Code
        const refCode = await this.prisma.referralCode.findUnique({
            where: { code: referralCode },
            include: { owner: true }
        });

        if (!refCode) {
            this.logger.warn(`Invalid referral code used: ${referralCode}`);
            return;
        }

        // 2. Fraud Safety: Self-Referral
        if (refCode.ownerId === userId) {
            this.logger.warn(`User ${userId} attempted self-referral`);
            return;
        }

        // 3. Fraud Safety: Circular Referrals (A -> B -> A)
        const referrerInternalReferral = await this.prisma.referral.findUnique({
            where: { refereeId: refCode.ownerId }
        });
        if (referrerInternalReferral?.referrerId === userId) {
            this.logger.error(`Circular referral detected: ${userId} <-> ${refCode.ownerId}`);
            return;
        }

        try {
            return await this.prisma.$transaction(async (tx) => {
                // Determine Source based on User Role (Defaulting to USER if not loaded yet)
                const user = await tx.user.findUnique({ where: { id: userId } });
                let source: ReferralSource = ReferralSource.USER_SIGNUP;
                if (user?.role === Role.AGENT) source = ReferralSource.AGENT_SIGNUP;
                if (user?.role === Role.ADVERTISER) source = ReferralSource.ADVERTISER_SIGNUP;

                // Create Lifecycle Record
                const referral = await tx.referral.create({
                    data: {
                        referrerId: refCode.ownerId,
                        refereeId: userId,
                        source,
                        status: ReferralStatus.PENDING,
                        ipAddress,
                        deviceId
                    }
                });

                // Link User for easy lookups
                await tx.user.update({
                    where: { id: userId },
                    data: { referredByCodeId: refCode.id }
                });

                // Update usage count
                await tx.referralCode.update({
                    where: { id: refCode.id },
                    data: { usageCount: { increment: 1 } }
                });

                return referral;
            });
        } catch (e) {
            this.logger.error(`Failed to track signup referral for ${userId}`, e);
        }
    }

    /**
     * Transition PENDING -> QUALIFIED
     * Triggers based on different criteria per role
     */
    async qualifyReferral(refereeId: string, source: ReferralSource) {
        const referral = await this.prisma.referral.findUnique({
            where: { refereeId }
        });

        if (!referral || referral.status !== ReferralStatus.PENDING) return;

        // Mark as Qualified
        const updated = await this.prisma.referral.update({
            where: { id: referral.id },
            data: {
                status: ReferralStatus.QUALIFIED,
                qualifiedAt: new Date(),
                triggeredAt: new Date()
            }
        });

        // Automatically trigger distribution if it meets criteria
        return this.distributeReward(updated.id);
    }

    /**
     * Transition QUALIFIED -> REWARDED
     * Calls RewardsService to actually move funds
     */
    async distributeReward(referralId: string) {
        const referral = await this.prisma.referral.findUnique({
            where: { id: referralId },
            include: { referrer: true }
        });

        if (!referral || referral.status !== ReferralStatus.QUALIFIED) return;

        try {
            // Call centralized RewardsService
            const dist = await this.rewardsService.triggerReferralReward(
                referral.id,
                referral.referrerId
            );

            if (dist) {
                return await this.prisma.referral.update({
                    where: { id: referral.id },
                    data: {
                        status: ReferralStatus.REWARDED,
                        rewardedAt: new Date(),
                        rewardId: dist.id,
                        rewardCents: dist.amountCents
                    }
                });
            }
        } catch (e) {
            this.logger.error(`Failed to distribute reward for referral ${referralId}`, e);
        }
    }

    /**
     * Stats for User Profile
     */
    async getMyStats(userId: string) {
        const [referralsCount, totalEarned] = await Promise.all([
            this.prisma.referral.count({ where: { referrerId: userId } }),
            this.prisma.referral.aggregate({
                where: { referrerId: userId, status: ReferralStatus.REWARDED },
                _sum: { rewardCents: true }
            })
        ]);

        return {
            invites: referralsCount,
            earnedCents: totalEarned._sum.rewardCents || 0,
            currency: Currency.USD
        };
    }

    /**
     * List of invited users for User Profile
     */
    async getInvitedUsers(userId: string) {
        return this.prisma.referral.findMany({
            where: { referrerId: userId },
            include: {
                referee: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
                        createdAt: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    /**
     * Admin: Get all referrals for monitoring
     */
    async getAllReferrals() {
        return this.prisma.referral.findMany({
            include: {
                referrer: { select: { name: true, email: true } },
                referee: { select: { name: true, email: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
    }
}
