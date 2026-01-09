import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FeatureFlagsService } from '../ops/feature-flags.service';
import { PayoutStatus } from '@prisma/client';
import { PaynowProvider } from './providers/paynow.provider';
import { BankProvider } from './providers/bank.provider';
import { ManualProvider } from './providers/manual.provider';
import { IPayoutProvider } from './providers/payout-provider.interface';

@Injectable()
export class PayoutExecutionService {
    private readonly logger = new Logger(PayoutExecutionService.name);
    private providers: IPayoutProvider[];

    constructor(
        private prisma: PrismaService,
        private featureFlags: FeatureFlagsService,
        private paynowProvider: PaynowProvider,
        private bankProvider: BankProvider,
        private manualProvider: ManualProvider
    ) {
        this.providers = [paynowProvider, bankProvider, manualProvider];
    }

    async executePayout(requestId: string, adminId: string) {
        const enabled = await this.featureFlags.getFlag('ENABLE_PAYOUTS', false);
        if (!enabled) {
            throw new BadRequestException('Payout execution is currently disabled');
        }

        const request = await this.prisma.payoutRequest.findUnique({
            where: { id: requestId },
            include: {
                payoutAccount: true,
                wallet: true
            }
        });

        if (!request || request.status !== PayoutStatus.REQUESTED) {
            throw new NotFoundException('Payout request not eligible for execution');
        }

        const provider = this.providers.find(p => p.canHandle(request.method));
        if (!provider) {
            throw new BadRequestException(`No provider for ${request.method}`);
        }

        // Lock & Execute
        // In a real system, we might use a distributed lock here (Redis).
        // For Postgres, we can update status to PROCESSING first.

        await this.prisma.payoutRequest.update({
            where: { id: requestId },
            data: { status: 'PROCESSING' as PayoutStatus } // Adjust enum if PROCESSING not in schema yet, usually SENT or PAID. Let's stick to REQUESTED -> SENT.
        });

        try {
            const result = await provider.processPayout(request, request.payoutAccount.detailsJson);

            // Record Execution
            await this.prisma.payoutExecution.create({
                data: {
                    payoutRequestId: requestId,
                    provider: result.metadata?.provider || 'unknown',
                    providerRef: result.transactionRef,
                    amountCents: request.amountCents,
                    currency: request.wallet.currency,
                    status: result.status,
                    responseJson: result as any
                }
            });

            // Update Request Status
            const newStatus = result.status === 'COMPLETED' ? PayoutStatus.PAID : PayoutStatus.SENT;

            await this.prisma.payoutRequest.update({
                where: { id: requestId },
                data: {
                    status: newStatus,
                    txRef: result.transactionRef
                }
            });

            return { success: true, status: newStatus };

        } catch (error: any) {
            this.logger.error(`Payout execution failed: ${error.message}`);

            // Log Failure
            await this.prisma.payoutExecution.create({
                data: {
                    payoutRequestId: requestId,
                    provider: 'unknown',
                    amountCents: request.amountCents,
                    currency: request.wallet.currency,
                    status: 'FAILED',
                    responseJson: { error: error.message }
                }
            });

            // Revert Status so it can be retried (or set to FAILED if terminal)
            // Ideally set to FAILED requires manual intervention to retry.
            await this.prisma.payoutRequest.update({
                where: { id: requestId },
                data: { status: PayoutStatus.FAILED }
            });

            throw error;
        }
    }
}
