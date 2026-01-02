import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PayoutStatus, PayoutRequest, WalletLedgerType, WalletLedgerSourceType } from '@prisma/client';
import { PayoutMethod } from './payout-method.enum';
import { PaynowProvider } from './providers/paynow.provider';
import { BankProvider } from './providers/bank.provider';
import { ManualProvider } from './providers/manual.provider';
import { LedgerService } from '../wallet/ledger.service';
import { IPayoutProvider } from './providers/payout-provider.interface';
import { MinThresholdRule } from './rules/min-threshold.rule';
import { KycRule } from './rules/kyc.rule';
import { FraudRule } from './rules/fraud.rule';

@Injectable()
export class PayoutsService {
    private readonly logger = new Logger(PayoutsService.name);
    private providers: IPayoutProvider[];

    constructor(
        private prisma: PrismaService,
        private ledgerService: LedgerService,
        private paynowProvider: PaynowProvider,
        private bankProvider: BankProvider,
        private manualProvider: ManualProvider,
        private minThresholdRule: MinThresholdRule,
        private kycRule: KycRule,
        private fraudRule: FraudRule,
    ) {
        this.providers = [paynowProvider, bankProvider, manualProvider];
    }

    async requestPayout(userId: string, amountCents: number, method: PayoutMethod, payoutAccountId: string) {
        // Validation
        const mockRequest = {
            walletId: (await this.getWalletId(userId)),
            amountCents,
            method: method as any,
            id: 'validation-check'
        } as any;

        await this.minThresholdRule.validate(mockRequest);
        await this.kycRule.validate(mockRequest);
        await this.fraudRule.validate(mockRequest);

        // 1. Validate Balance
        const wallet = await this.prisma.wallet.findFirst({
            where: { ownerId: userId },
        });
        if (!wallet || wallet.balanceCents < amountCents) {
            throw new BadRequestException('Insufficient funds');
        }

        // 2. Validate Payout Account
        const account = await this.prisma.payoutAccount.findFirst({
            where: { id: payoutAccountId, ownerId: userId },
        });
        if (!account) {
            throw new BadRequestException('Invalid payout account');
        }

        // 3. Create Request
        const result = await this.prisma.$transaction(async (tx) => {
            // Create Request
            const request = await tx.payoutRequest.create({
                data: {
                    walletId: wallet.id,
                    amountCents,
                    method: method as any,
                    payoutAccountId,
                    status: PayoutStatus.REQUESTED,
                },
            });

            // Debit Ledger (Hold Funds)
            await this.ledgerService.recordTransaction(
                userId,
                amountCents,
                WalletLedgerType.DEBIT,
                WalletLedgerSourceType.PAYOUT,
                request.id,
                wallet.currency,
                wallet.id
            );

            return request;
        });

        return result;
    }

    private async getWalletId(userId: string): Promise<string> {
        const w = await this.prisma.wallet.findFirst({ where: { ownerId: userId } });
        return w?.id || '';
    }

    async approvePayout(requestId: string, adminId: string) {
        const request = await this.prisma.payoutRequest.findUnique({
            where: { id: requestId },
            include: { payoutAccount: true },
        });
        if (!request || request.status !== PayoutStatus.REQUESTED) {
            throw new NotFoundException('Payout request not found or not in requested state');
        }

        // Find Provider
        const provider = this.providers.find((p) => p.canHandle(request.method));
        if (!provider) {
            throw new BadRequestException(`No provider found for method ${request.method}`);
        }

        // Process
        try {
            const result = await provider.processPayout(request, request.payoutAccount.detailsJson);

            await this.prisma.payoutRequest.update({
                where: { id: requestId },
                data: {
                    status: result.status === 'COMPLETED' ? PayoutStatus.PAID : PayoutStatus.SENT, // Use SENT or PAID
                    txRef: result.transactionRef,
                },
            });

            return { success: true, result };
        } catch (error: any) {
            this.logger.error(`Payout failed: ${error.message}`);
            await this.prisma.payoutRequest.update({
                where: { id: requestId },
                data: { status: PayoutStatus.FAILED },
            });
            throw error;
        }
    }

    async getMyPayouts(userId: string) {
        return this.prisma.payoutRequest.findMany({
            where: { wallet: { ownerId: userId } },
            orderBy: { createdAt: 'desc' },
        });
    }

    async getAllPayouts() {
        return this.prisma.payoutRequest.findMany({
            orderBy: { createdAt: 'desc' },
            include: { wallet: { include: { user: true } } },
        });
    }
}
