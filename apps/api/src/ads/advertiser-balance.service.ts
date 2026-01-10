import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { Prisma, PrismaClient, WalletLedgerSourceType } from '@prisma/client';

type PrismaClientOrTx = PrismaClient | Prisma.TransactionClient;

interface DeductResult {
    success: boolean;
    newBalance: number;
    deductedAmount: number;
}

@Injectable()
export class AdvertiserBalanceService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly audit: AuditService,
    ) { }

    /**
     * Get advertiser balance
     */
    async getBalance(advertiserId: string): Promise<{ balanceCents: number }> {
        const advertiser = await this.prisma.advertiser.findUnique({
            where: { id: advertiserId },
            select: { balanceCents: true },
        });

        if (!advertiser) {
            throw new NotFoundException('Advertiser not found');
        }

        return { balanceCents: advertiser.balanceCents };
    }

    /**
     * Top up advertiser balance (atomic)
     */
    async topUp(
        advertiserId: string,
        amountCents: number,
        actorId?: string,
        referenceId?: string,
    ): Promise<{ balanceCents: number }> {
        if (amountCents <= 0) {
            throw new BadRequestException('Amount must be positive');
        }

        return this.prisma.$transaction(async (tx: PrismaClientOrTx) => {
            const advertiser = await tx.advertiser.findUnique({
                where: { id: advertiserId },
            });

            if (!advertiser) {
                throw new NotFoundException('Advertiser not found');
            }

            const newBalance = advertiser.balanceCents + amountCents;

            await tx.advertiser.update({
                where: { id: advertiserId },
                data: { balanceCents: newBalance },
            });

            await (tx as any).advertiserBalanceLog.create({
                data: {
                    advertiserId,
                    type: 'CREDIT',
                    amountCents,
                    reason: 'TOPUP',
                    referenceId,
                    balanceAfter: newBalance,
                },
            });

            if (actorId) {
                await this.audit.logAction({
                    action: 'advertiser.balance.topup',
                    actorId,
                    targetType: 'advertiser',
                    targetId: advertiserId,
                    metadata: { amountCents, newBalance },
                });
            }

            return { balanceCents: newBalance };
        });
    }

    /**
     * Deduct for impression (atomic, returns false if insufficient balance)
     */
    async deductImpression(
        advertiserId: string,
        campaignId: string,
        costMicros: number,
        referenceId?: string,
    ): Promise<DeductResult> {
        const costCents = Math.ceil(costMicros / 10000);
        return this.deductBalance(advertiserId, costCents, 'IMPRESSION', campaignId, referenceId);
    }

    /**
     * Deduct for click (atomic, returns false if insufficient balance)
     */
    async deductClick(
        advertiserId: string,
        campaignId: string,
        costMicros: number,
        referenceId?: string,
    ): Promise<DeductResult> {
        const costCents = Math.ceil(costMicros / 10000);
        return this.deductBalance(advertiserId, costCents, 'CLICK', campaignId, referenceId);
    }

    /**
     * Generic deduct balance (atomic, no negative balances)
     */
    private async deductBalance(
        advertiserId: string,
        amountCents: number,
        reason: 'IMPRESSION' | 'CLICK' | 'REFUND',
        campaignId?: string,
        referenceId?: string,
    ): Promise<DeductResult> {
        if (amountCents <= 0) {
            return { success: true, newBalance: 0, deductedAmount: 0 };
        }

        return this.prisma.$transaction(async (tx: PrismaClientOrTx) => {
            const advertiser = await tx.advertiser.findUnique({
                where: { id: advertiserId },
                select: { balanceCents: true, ownerId: true },
            });

            if (!advertiser) {
                throw new NotFoundException('Advertiser not found');
            }

            // Check sufficient balance
            if (advertiser.balanceCents < amountCents) {
                // Insufficient balance - trigger auto-pause
                await this.autoPauseCampaigns(advertiserId, tx);
                return {
                    success: false,
                    newBalance: advertiser.balanceCents,
                    deductedAmount: 0,
                };
            }

            const newBalance = advertiser.balanceCents - amountCents;

            await tx.advertiser.update({
                where: { id: advertiserId },
                data: { balanceCents: newBalance },
            });

            // Update campaign spent amount if provided
            if (campaignId) {
                await tx.adCampaign.update({
                    where: { id: campaignId },
                    data: { spentCents: { increment: amountCents } },
                });
            }

            await (tx as any).advertiserBalanceLog.create({
                data: {
                    advertiserId,
                    type: 'DEBIT',
                    amountCents,
                    reason,
                    referenceId, // This is the campaignId passed from deductBalance
                    balanceAfter: newBalance,
                },
            });

            // [Hardening] Log detailed audit for spend
            await this.audit.logAction({
                action: `ads.${reason.toLowerCase()}.debit`,
                actorId: undefined, // System action
                targetType: 'adCampaign',
                targetId: campaignId,
                metadata: { amountCents, balanceAfter: newBalance, advertiserId },
            });

            // Check if we need to auto-pause after this deduction
            if (newBalance <= 0) {
                await this.autoPauseCampaigns(advertiserId, tx);
            }

            // Create WalletLedger entry if owner exists
            if (advertiser.ownerId) {
                await (tx as any).walletLedger.create({
                    data: {
                        userId: advertiser.ownerId,
                        type: 'DEBIT',
                        sourceType: 'AD_SPEND' as any,
                        sourceId: referenceId || campaignId || 'unknown',
                        amountCents,
                        currency: 'USD', // Assuming USD for now based on ads system
                    },
                });
            }

            return {
                success: true,
                newBalance,
                deductedAmount: amountCents,
            };
        });
    }

    /**
     * Auto-pause all active campaigns for advertiser
     */
    async autoPauseCampaigns(
        advertiserId: string,
        tx?: PrismaClientOrTx,
    ): Promise<{ pausedCount: number }> {
        const client = tx || this.prisma;

        const result = await client.adCampaign.updateMany({
            where: {
                advertiserId,
                status: 'ACTIVE',
            },
            data: {
                status: 'PAUSED',
            },
        });

        if (result.count > 0) {
            await this.audit.logAction({
                action: 'advertiser.campaigns.auto-paused',
                actorId: undefined,
                targetType: 'advertiser',
                targetId: advertiserId,
                metadata: { pausedCount: result.count, reason: 'INSUFFICIENT_BALANCE' },
            });
        }

        return { pausedCount: result.count };
    }

    /**
     * Check if advertiser can afford cost
     */
    async canAfford(advertiserId: string, costCents: number): Promise<boolean> {
        const { balanceCents } = await this.getBalance(advertiserId);
        return balanceCents >= costCents;
    }

    /**
     * Get balance history/logs
     */
    async getBalanceLogs(
        advertiserId: string,
        limit: number = 50,
    ) {
        return this.prisma.advertiserBalanceLog.findMany({
            where: { advertiserId },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
    }

    /**
     * Refund to advertiser balance (for failed impressions/clicks)
     */
    async refund(
        advertiserId: string,
        amountCents: number,
        referenceId?: string,
    ): Promise<{ balanceCents: number }> {
        if (amountCents <= 0) {
            throw new BadRequestException('Refund amount must be positive');
        }

        return this.prisma.$transaction(async (tx: PrismaClientOrTx) => {
            const advertiser = await tx.advertiser.findUnique({
                where: { id: advertiserId },
            });

            if (!advertiser) {
                throw new NotFoundException('Advertiser not found');
            }

            const newBalance = advertiser.balanceCents + amountCents;

            await tx.advertiser.update({
                where: { id: advertiserId },
                data: { balanceCents: newBalance },
            });

            await (tx as any).advertiserBalanceLog.create({
                data: {
                    advertiserId,
                    type: 'CREDIT',
                    amountCents,
                    reason: 'REFUND',
                    referenceId,
                    balanceAfter: newBalance,
                },
            });

            return { balanceCents: newBalance };
        });
    }
}
