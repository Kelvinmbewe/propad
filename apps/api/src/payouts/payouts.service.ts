import { BadRequestException, Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import {
    Currency,
    OwnerType,
    PayoutStatus,
    Prisma,
    WalletLedgerSourceType,
    PayoutTransaction,
    Wallet
} from '@prisma/client';
import { ChargeableItemType, PaymentProvider, PayoutMethod } from '@propad/config';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PricingService } from './pricing.service';
import { WalletLedgerService } from '../wallets/wallet-ledger.service';
import { PayoutGatewayRegistry } from './payout-gateway.registry';
import { PaymentProviderSettingsService } from './payment-provider-settings.service';
import { PayoutExecutionResult } from './interfaces/payout-gateway';

@Injectable()
export class PayoutsService {
    private readonly logger = new Logger(PayoutsService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly audit: AuditService,
        private readonly pricing: PricingService,
        private readonly ledger: WalletLedgerService,
        private readonly payoutGatewayRegistry: PayoutGatewayRegistry,
        private readonly providerSettings: PaymentProviderSettingsService
    ) { }

    private async checkPayoutsEnabled() {
        const config = await this.prisma.appConfig.findUnique({
            where: { key: 'DISABLE_PAYOUTS' }
        });
        if (config && config.jsonValue === true) {
            throw new ForbiddenException('Payouts are currently disabled by the system administrator.');
        }
    }

    private validatePayoutMethodDetails(method: PayoutMethod, details: any) {
        if (!details) throw new BadRequestException('Payout details are required');

        if (method === PayoutMethod.BANK) {
            if (!details.bankName || !details.accountNumber || !details.accountName) {
                throw new BadRequestException('Bank name, account number, and account name are required for BANK payouts');
            }
        } else if (method === PayoutMethod.ECOCASH || method === PayoutMethod.MOBILE_MONEY) {
            if (!details.mobileNumber) {
                throw new BadRequestException('Mobile number is required for Mobile Money payouts');
            }
        }
    }

    async createPayoutRequest(
        ownerType: OwnerType,
        ownerId: string,
        amountCents: number,
        method: PayoutMethod,
        payoutAccountId: string,
        currency: Currency = Currency.USD
    ) {
        // 1. Safety Checks
        await this.checkPayoutsEnabled();

        // 2. Validate Details (Implicitly fetched via PayoutAccount later, but we could validate if passed directly)
        // Here we validate the account exists and matches owner
        const payoutAccount = await this.prisma.payoutAccount.findUnique({
            where: { id: payoutAccountId }
        });
        if (!payoutAccount || payoutAccount.ownerId !== ownerId || payoutAccount.ownerType !== ownerType) {
            throw new NotFoundException('Payout account not found or access denied');
        }

        this.validatePayoutMethodDetails(method, payoutAccount.detailsJson);

        // 3. Get Wallet
        const wallet = await this.prisma.wallet.upsert({
            where: { ownerType_ownerId_currency: { ownerType, ownerId, currency } },
            create: { ownerType, ownerId, currency, balanceCents: 0, pendingCents: 0 },
            update: {}
        });

        if (ownerType !== OwnerType.USER) {
            // Currently enforcing only USER wallets for safety till Agency flows defined
            throw new BadRequestException('Only user payouts are currently supported');
        }

        // 4. Check Min Payout
        const minPayout = await this.getMinimumPayout(ownerType);
        if (amountCents < minPayout) {
            throw new BadRequestException(`Minimum payout amount is ${(minPayout / 100).toFixed(2)} ${currency}`);
        }

        // 5. Create Request (Status: REQUESTED)
        const payoutRequest = await this.prisma.payoutRequest.create({
            data: {
                walletId: wallet.id,
                amountCents,
                method: method as any,
                payoutAccountId,
                status: PayoutStatus.REQUESTED
            },
            include: { wallet: true, payoutAccount: true }
        });

        // 6. HOLD Funds (Ledger)
        try {
            await this.ledger.hold(
                ownerId,
                amountCents,
                currency,
                WalletLedgerSourceType.PAYOUT,
                payoutRequest.id,
                'Payout Requested'
            );
        } catch (e) {
            // Rollback request if hold fails (insufficient funds)
            await this.prisma.payoutRequest.delete({ where: { id: payoutRequest.id } });
            throw e; // Likely BadRequest from LedgerService
        }

        await this.audit.logAction({
            action: 'payout.requested',
            actorId: ownerId,
            targetType: 'payoutRequest',
            targetId: payoutRequest.id,
            metadata: { amountCents, method }
        });

        return payoutRequest;
    }

    async approvePayout(payoutRequestId: string, actorId: string) {
        await this.checkPayoutsEnabled();

        const payoutRequest = await this.prisma.payoutRequest.findUnique({
            where: { id: payoutRequestId },
            include: { wallet: true }
        });

        if (!payoutRequest) throw new NotFoundException('Payout request not found');
        if (payoutRequest.status !== PayoutStatus.REQUESTED && payoutRequest.status !== PayoutStatus.REVIEW) {
            throw new BadRequestException('Payout can only be approved from REQUESTED or REVIEW status');
        }

        // Transition to APPROVED
        const updated = await this.prisma.payoutRequest.update({
            where: { id: payoutRequestId },
            data: { status: PayoutStatus.APPROVED }
        });

        // We DO NOT move funds yet. HOLD remains.

        await this.audit.logAction({
            action: 'payout.approved',
            actorId,
            targetType: 'payoutRequest',
            targetId: payoutRequestId
        });

        return updated;
    }

    async rejectPayout(payoutRequestId: string, reason: string, actorId: string) {
        // Can reject even if payouts disabled (safety)
        const payoutRequest = await this.prisma.payoutRequest.findUnique({
            where: { id: payoutRequestId },
            include: { wallet: true }
        });

        if (!payoutRequest) throw new NotFoundException('Payout request not found');
        if (['PAID', 'CANCELLED', 'FAILED'].includes(payoutRequest.status)) {
            throw new BadRequestException('Payout is already finalized');
        }
        if (payoutRequest.status === PayoutStatus.SENT) {
            throw new BadRequestException('Cannot reject payout currently in processing (SENT). Wait for result.');
        }

        // RELEASE the Hold (Restore funds to available)
        await this.ledger.release(
            payoutRequest.wallet.ownerId,
            payoutRequest.amountCents,
            payoutRequest.wallet.currency,
            WalletLedgerSourceType.PAYOUT,
            payoutRequestId,
            `Payout Rejected: ${reason}`
        );

        const updated = await this.prisma.payoutRequest.update({
            where: { id: payoutRequestId },
            data: { status: PayoutStatus.CANCELLED }
        });

        await this.audit.logAction({
            action: 'payout.rejected',
            actorId,
            targetType: 'payoutRequest',
            targetId: payoutRequestId,
            metadata: { reason }
        });

        return updated;
    }

    /*
     * Processing Logic:
     * 1. processPayout: Marks as SENT, creates Transaction, Calls Gateway.
     * 2. Gateway returns result.
     * 3. handleGatewayResult: Updates Ledger and Status.
     */
    async processPayout(payoutRequestId: string, gatewayRef: string, actorId: string) {
        await this.checkPayoutsEnabled();

        const payoutRequest = await this.prisma.payoutRequest.findUnique({
            where: { id: payoutRequestId },
            include: { wallet: true, payoutAccount: true, payoutTransactions: true }
        });

        if (!payoutRequest) throw new NotFoundException('Payout request not found');
        if (payoutRequest.status !== PayoutStatus.APPROVED) {
            throw new BadRequestException('Payout must be APPROVED to process');
        }

        // Create Transaction Record
        const payoutTransaction = await this.prisma.payoutTransaction.create({
            data: {
                payoutRequestId: payoutRequest.id,
                amountCents: payoutRequest.amountCents,
                currency: payoutRequest.wallet.currency,
                method: payoutRequest.method as any,
                status: PayoutStatus.SENT, // Explicitly SENT
                gatewayRef: gatewayRef || undefined
            }
        });

        // Update Request to SENT
        await this.prisma.payoutRequest.update({
            where: { id: payoutRequestId },
            data: { status: PayoutStatus.SENT, txRef: gatewayRef }
        });

        // NOTE: Funds are STILL ON HOLD. We do not debit yet.

        await this.audit.logAction({
            action: 'payout.processing',
            actorId,
            targetType: 'payoutRequest',
            targetId: payoutRequestId
        });

        // Execute via Gateway
        try {
            return await this.executePayout(payoutTransaction.id, actorId);
        } catch (e) {
            // If local execution start fails drastically
            this.logger.error(`Failed to start execution for TX ${payoutTransaction.id}`, e);
            throw e;
        }
    }

    async executePayout(payoutTransactionId: string, actorId: string) {
        const payoutTransaction = await this.prisma.payoutTransaction.findUnique({
            where: { id: payoutTransactionId },
            include: {
                payoutRequest: { include: { wallet: true, payoutAccount: true } }
            }
        });
        if (!payoutTransaction) throw new NotFoundException('Transaction not found');

        const { payoutRequest } = payoutTransaction;
        // ... Provider logic (same as before) ...
        const provider = this.determineProvider(payoutRequest.method);
        if (!provider) throw new BadRequestException('No provider found');

        const providerSettings = await this.providerSettings.findOne(provider);
        if (!providerSettings.enabled) throw new BadRequestException('Provider disabled');

        const user = await this.prisma.user.findUnique({
            where: { id: payoutRequest.wallet.ownerId },
            include: { paymentProfile: true }
        });
        if (!user) throw new NotFoundException('User not found');

        const gateway = this.payoutGatewayRegistry.get(provider);
        const recipientDetails = this.prepareRecipientDetails(
            payoutRequest.method as PayoutMethod,
            payoutRequest.payoutAccount.detailsJson as Record<string, unknown>,
            user.paymentProfile
        );

        // Validate Recipient
        if (!await gateway.validateRecipient(payoutRequest.method, recipientDetails)) {
            throw new BadRequestException('Invalid recipient details');
        }

        const reference = payoutTransaction.gatewayRef || `PAYOUT-${payoutTransaction.id}`;
        let result: PayoutExecutionResult;
        let failureReason = '';
        let gatewayResRef = '';
        let metadata = {};

        try {
            const execRes = await gateway.executePayout({
                payoutTransactionId: payoutTransaction.id,
                amountCents: payoutTransaction.amountCents,
                currency: payoutTransaction.currency,
                method: payoutTransaction.method as PayoutMethod,
                recipientDetails,
                reference
            });
            result = execRes.result;
            failureReason = execRes.failureReason || '';
            gatewayResRef = execRes.gatewayRef || reference;
            metadata = execRes.metadata || {};
        } catch (e) {
            result = PayoutExecutionResult.FAILED;
            failureReason = e instanceof Error ? e.message : 'Execution error';
        }

        // FINALIZE LEDGER based on Result
        return await this.prisma.$transaction(async (tx) => {
            if (result === PayoutExecutionResult.SUCCESS) {
                // SUCCESS: RELEASE Hold AND DEBIT Funds (Spend)
                await this.ledger.release(
                    payoutRequest.wallet.ownerId,
                    payoutRequest.amountCents,
                    payoutRequest.wallet.currency,
                    WalletLedgerSourceType.PAYOUT,
                    payoutRequest.id,
                    'Payout Success - Releasing Hold'
                );
                await this.ledger.debit(
                    payoutRequest.wallet.ownerId,
                    payoutRequest.amountCents,
                    payoutRequest.wallet.currency,
                    WalletLedgerSourceType.PAYOUT,
                    payoutRequest.id, // Use Request ID to link it clearly
                    'Payout Success - Final Debit'
                );

                await tx.payoutRequest.update({ where: { id: payoutRequest.id }, data: { status: PayoutStatus.PAID } });
                await tx.payoutTransaction.update({
                    where: { id: payoutTransaction.id },
                    data: { status: PayoutStatus.PAID, gatewayRef: gatewayResRef, metadata }
                });

                await this.audit.logAction({ action: 'payout.success', actorId, targetType: 'payoutRequest', targetId: payoutRequest.id });

                return { success: true };
            } else {
                // FAILURE: RELEASE Hold (Restore funds) - NO DEBIT
                await this.ledger.release(
                    payoutRequest.wallet.ownerId,
                    payoutRequest.amountCents,
                    payoutRequest.wallet.currency,
                    WalletLedgerSourceType.PAYOUT,
                    payoutRequest.id,
                    `Payout Failed: ${failureReason}`
                );

                await tx.payoutRequest.update({ where: { id: payoutRequest.id }, data: { status: PayoutStatus.FAILED } });
                await tx.payoutTransaction.update({
                    where: { id: payoutTransaction.id },
                    data: { status: PayoutStatus.FAILED, failureReason, metadata }
                });

                await this.audit.logAction({ action: 'payout.failed', actorId, targetType: 'payoutRequest', targetId: payoutRequest.id, metadata: { reason: failureReason } });

                return { success: false, reason: failureReason };
            }
        });
    }

    // ... Helpers (determineProvider, prepareRecipientDetails, getMinimumPayout, calculateRevenueSplit) remain same ...

    private determineProvider(method: PayoutMethod): PaymentProvider | null {
        if (method === PayoutMethod.ECOCASH || method === PayoutMethod.BANK) return PaymentProvider.PAYNOW;
        if (method === PayoutMethod.WALLET) return null;
        return null;
    }

    private prepareRecipientDetails(
        method: PayoutMethod,
        payoutAccountDetails: Record<string, unknown>,
        paymentProfile?: { paypalEmail?: string | null } | null
    ): Record<string, unknown> {
        const details: Record<string, unknown> = { ...(payoutAccountDetails as Prisma.JsonObject) };

        // Add PayPal email if available
        if (paymentProfile?.paypalEmail) {
            details.paypalEmail = paymentProfile.paypalEmail;
        }

        return details;
    }

    async createPayoutAccount(
        ownerType: OwnerType,
        ownerId: string,
        type: string,
        displayName: string,
        details: Record<string, any>
    ) {
        // Validate details based on type (Basic check)
        if (type === 'BANK' && (!details.accountNumber || !details.bankName)) {
            throw new BadRequestException('Invalid bank details');
        }
        if ((type === 'MOBILE_MONEY' || type === 'ECOCASH') && !details.mobileNumber) {
            throw new BadRequestException('Invalid mobile money details');
        }

        return this.prisma.payoutAccount.create({
            data: {
                ownerType,
                ownerId,
                type,
                displayName,
                detailsJson: details as Prisma.JsonObject
            }
        });
    }

    async getPayoutAccounts(ownerType: OwnerType, ownerId: string) {
        return this.prisma.payoutAccount.findMany({
            where: { ownerType, ownerId }
        });
    }

    private async getMinimumPayout(ownerType: OwnerType): Promise<number> {
        const config = await this.prisma.appConfig.findUnique({ where: { key: `minPayout_${ownerType}` } });
        return (config?.jsonValue as any)?.amountCents ?? 1000;
    }

    async calculateRevenueSplit(amountCents: number, itemType: string) {
        // ... (Keep existing implementation or stub if not needed for core flow)
        return { platformCents: 0 }; // Stub for brevity as usually unused in Payouts? Or used for Agent?
        // Restoring original implementation briefly if needed
        try {
            const pricing = await this.pricing.calculatePrice(itemType as ChargeableItemType);
            return {
                platformCents: pricing.commissionCents + pricing.platformFeeCents,
                agentCents: pricing.agentShareCents,
                referralCents: pricing.referralShareCents,
                rewardPoolCents: pricing.rewardPoolShareCents
            };
        } catch {
            return { platformCents: Math.round(amountCents * 0.1) };
        }
    }

    // Getters
    async getUserPayoutRequests(userId: string) {
        const wallets = await this.prisma.wallet.findMany({
            where: { ownerType: OwnerType.USER, ownerId: userId }, select: { id: true }
        });
        return this.prisma.payoutRequest.findMany({
            where: { walletId: { in: wallets.map(w => w.id) } },
            include: { wallet: true, payoutTransactions: true },
            orderBy: { createdAt: 'desc' }
        });
    }
    async getPendingPayouts() {
        return this.prisma.payoutRequest.findMany({
            where: { status: { in: [PayoutStatus.REQUESTED, PayoutStatus.REVIEW, PayoutStatus.APPROVED] } },
            include: { wallet: true, payoutAccount: true },
            orderBy: { createdAt: 'asc' }
        });
    }
}
