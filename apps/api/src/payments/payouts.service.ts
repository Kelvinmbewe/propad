import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  ChargeableItemType,
  Currency,
  OwnerType,
  PayoutMethod,
  PayoutStatus,
  Prisma,
  WalletTransactionSource,
  WalletLedgerSourceType,
  PaymentProvider
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PricingService } from './pricing.service';
import { WalletLedgerService } from '../wallets/wallet-ledger.service';
import { PayoutGatewayRegistry } from './payout-gateway.registry';
import { PaymentProviderSettingsService } from './payment-provider-settings.service';
import { PayoutExecutionResult } from './interfaces/payout-gateway';

@Injectable()
export class PayoutsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly pricing: PricingService,
    private readonly ledger: WalletLedgerService,
    private readonly payoutGatewayRegistry: PayoutGatewayRegistry,
    private readonly providerSettings: PaymentProviderSettingsService
  ) {}

  async createPayoutRequest(
    ownerType: OwnerType,
    ownerId: string,
    amountCents: number,
    method: PayoutMethod,
    payoutAccountId: string,
    currency: Currency = Currency.USD
  ) {
    // Get or create wallet
    const wallet = await this.prisma.wallet.upsert({
      where: {
        ownerType_ownerId_currency: {
          ownerType,
          ownerId,
          currency
        }
      },
      create: {
        ownerType,
        ownerId,
        currency,
        balanceCents: 0,
        pendingCents: 0
      },
      update: {}
    });

    // Check minimum payout amount (configurable per role)
    const minPayout = await this.getMinimumPayout(ownerType);
    if (amountCents < minPayout) {
      throw new BadRequestException(
        `Minimum payout amount is ${(minPayout / 100).toFixed(2)} ${currency}`
      );
    }

    // Verify payout account
    const payoutAccount = await this.prisma.payoutAccount.findUnique({
      where: { id: payoutAccountId }
    });
    if (!payoutAccount || payoutAccount.ownerId !== ownerId || payoutAccount.ownerType !== ownerType) {
      throw new NotFoundException('Payout account not found');
    }

    // Check available balance using ledger
    if (ownerType !== OwnerType.USER) {
      throw new BadRequestException('Only user wallets supported for ledger-based payouts');
    }

    const hasBalance = await this.ledger.verifyBalance(ownerId, currency, amountCents);
    if (!hasBalance) {
      throw new BadRequestException('Insufficient balance for payout');
    }

    // Create payout request (no ledger entry yet - will be created on approval)
    const payoutRequest = await this.prisma.payoutRequest.create({
      data: {
        walletId: wallet.id,
        amountCents,
        method,
        payoutAccountId,
        status: PayoutStatus.REQUESTED
      },
      include: {
        wallet: true,
        payoutAccount: true
      }
    });

    await this.audit.log({
      action: 'payout.requested',
      actorId: ownerId,
      targetType: 'payoutRequest',
      targetId: payoutRequest.id,
      metadata: { amountCents, method }
    });

    return payoutRequest;
  }

  async approvePayout(payoutRequestId: string, actorId: string) {
    const payoutRequest = await this.prisma.payoutRequest.findUnique({
      where: { id: payoutRequestId },
      include: { wallet: true, payoutAccount: true }
    });

    if (!payoutRequest) {
      throw new NotFoundException('Payout request not found');
    }

    if (payoutRequest.status !== PayoutStatus.REQUESTED && payoutRequest.status !== PayoutStatus.REVIEW) {
      throw new BadRequestException('Payout request cannot be approved in current status');
    }

    // Verify balance again before approval
    if (payoutRequest.wallet.ownerType !== OwnerType.USER) {
      throw new BadRequestException('Only user wallets supported');
    }

    const hasBalance = await this.ledger.verifyBalance(
      payoutRequest.wallet.ownerId,
      payoutRequest.wallet.currency,
      payoutRequest.amountCents
    );
    if (!hasBalance) {
      throw new BadRequestException('Insufficient balance for payout approval');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // Update status to APPROVED (will transition to PROCESSING when execution starts)
      const payout = await tx.payoutRequest.update({
        where: { id: payoutRequestId },
        data: { status: PayoutStatus.APPROVED }
      });

      // Create payout transaction record
      await tx.payoutTransaction.create({
        data: {
          payoutRequestId: payout.id,
          amountCents: payout.amountCents,
          currency: payout.wallet.currency,
          method: payout.method,
          status: PayoutStatus.APPROVED
        }
      });

      return payout;
    });

    await this.audit.log({
      action: 'payout.approved',
      actorId,
      targetType: 'payoutRequest',
      targetId: payoutRequestId
    });

    return updated;
  }

  async rejectPayout(payoutRequestId: string, reason: string, actorId: string) {
    const payoutRequest = await this.prisma.payoutRequest.findUnique({
      where: { id: payoutRequestId },
      include: { wallet: true }
    });

    if (!payoutRequest) {
      throw new NotFoundException('Payout request not found');
    }

    // If already processed (has DEBIT entry), we can't reject - must reverse
    if (payoutRequest.status === PayoutStatus.PROCESSING || payoutRequest.status === PayoutStatus.PAID) {
      throw new BadRequestException('Cannot reject payout that is already processing or paid');
    }

    // Simply cancel - no ledger entry needed since we never created a DEBIT
    const updated = await this.prisma.payoutRequest.update({
      where: { id: payoutRequestId },
      data: {
        status: PayoutStatus.CANCELLED
      }
    });

    await this.audit.log({
      action: 'payout.rejected',
      actorId,
      targetType: 'payoutRequest',
      targetId: payoutRequestId,
      metadata: { reason }
    });

    return updated;
  }

  async processPayout(payoutRequestId: string, gatewayRef: string, actorId: string) {
    const payoutRequest = await this.prisma.payoutRequest.findUnique({
      where: { id: payoutRequestId },
      include: { wallet: true, payoutAccount: true, payoutTransactions: true }
    });

    if (!payoutRequest) {
      throw new NotFoundException('Payout request not found');
    }

    if (payoutRequest.status !== PayoutStatus.APPROVED) {
      throw new BadRequestException('Payout must be approved before processing');
    }

    if (payoutRequest.wallet.ownerType !== OwnerType.USER) {
      throw new BadRequestException('Only user wallets supported');
    }

    // Verify balance one more time
    const hasBalance = await this.ledger.verifyBalance(
      payoutRequest.wallet.ownerId,
      payoutRequest.wallet.currency,
      payoutRequest.amountCents
    );
    if (!hasBalance) {
      throw new BadRequestException('Insufficient balance for payout processing');
    }

    // Get or create payout transaction
    let payoutTransaction = payoutRequest.payoutTransactions.find(
      (t) => t.status === PayoutStatus.APPROVED || t.status === PayoutStatus.PROCESSING
    );

    if (!payoutTransaction) {
      payoutTransaction = await this.prisma.payoutTransaction.create({
        data: {
          payoutRequestId: payoutRequest.id,
          amountCents: payoutRequest.amountCents,
          currency: payoutRequest.wallet.currency,
          method: payoutRequest.method,
          status: PayoutStatus.APPROVED,
          gatewayRef: gatewayRef || undefined
        }
      });
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // Update status to PROCESSING (locks the balance)
      const payout = await tx.payoutRequest.update({
        where: { id: payoutRequestId },
        data: {
          status: PayoutStatus.PROCESSING,
          txRef: gatewayRef
        }
      });

      // Create DEBIT ledger entry (locks balance during processing)
      await this.ledger.debit(
        payoutRequest.wallet.ownerId,
        payoutRequest.amountCents,
        payoutRequest.wallet.currency,
        WalletLedgerSourceType.PAYOUT,
        payoutRequestId
      );

      // Update payout transaction to PROCESSING
      await tx.payoutTransaction.update({
        where: { id: payoutTransaction.id },
        data: {
          status: PayoutStatus.PROCESSING,
          gatewayRef: gatewayRef || undefined,
          processedAt: new Date(),
          processedBy: actorId
        }
      });

      return payout;
    });

    await this.audit.log({
      action: 'payout.processed',
      actorId,
      targetType: 'payoutRequest',
      targetId: payoutRequestId,
      metadata: { gatewayRef }
    });

    // Automatically execute the payout
    try {
      await this.executePayout(payoutTransaction.id, actorId);
    } catch (error) {
      // Execution failure is already handled in executePayout (reverts debit)
      // Just log and rethrow
      await this.audit.log({
        action: 'payout.execution.failed',
        actorId,
        targetType: 'payoutTransaction',
        targetId: payoutTransaction.id,
        metadata: { error: error instanceof Error ? error.message : String(error) }
      });
      throw error;
    }

    return updated;
  }

  async getUserPayoutRequests(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        paymentProfile: true
      }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get user's wallets
    const wallets = await this.prisma.wallet.findMany({
      where: {
        ownerType: OwnerType.USER,
        ownerId: userId
      }
    });

    const walletIds = wallets.map((w) => w.id);

    return this.prisma.payoutRequest.findMany({
      where: {
        walletId: { in: walletIds }
      },
      include: {
        wallet: true,
        payoutAccount: true,
        payoutTransactions: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getPendingPayouts() {
    return this.prisma.payoutRequest.findMany({
      where: {
        status: {
          in: [PayoutStatus.REQUESTED, PayoutStatus.REVIEW, PayoutStatus.APPROVED]
        }
      },
      include: {
        wallet: true,
        payoutAccount: true,
        payoutTransactions: true
      },
      orderBy: { createdAt: 'asc' }
    });
  }

  async markPayoutPaid(payoutRequestId: string, actorId: string) {
    const payoutRequest = await this.prisma.payoutRequest.findUnique({
      where: { id: payoutRequestId },
      include: { wallet: true }
    });

    if (!payoutRequest) {
      throw new NotFoundException('Payout request not found');
    }

    if (payoutRequest.status !== PayoutStatus.PROCESSING) {
      throw new BadRequestException('Payout must be in PROCESSING state to mark as paid');
    }

    const updated = await this.prisma.payoutRequest.update({
      where: { id: payoutRequestId },
      data: {
        status: PayoutStatus.PAID
      }
    });

    await this.prisma.payoutTransaction.updateMany({
      where: { payoutRequestId },
      data: {
        status: PayoutStatus.PAID
      }
    });

    await this.audit.log({
      action: 'payout.paid',
      actorId,
      targetType: 'payoutRequest',
      targetId: payoutRequestId
    });

    return updated;
  }

  /**
   * Execute a payout transaction via the appropriate gateway
   * Only executes when PayoutTransaction.status === PROCESSING
   */
  async executePayout(payoutTransactionId: string, actorId: string) {
    const payoutTransaction = await this.prisma.payoutTransaction.findUnique({
      where: { id: payoutTransactionId },
      include: {
        payoutRequest: {
          include: {
            wallet: true,
            payoutAccount: true
          }
        }
      }
    });

    if (!payoutTransaction) {
      throw new NotFoundException('Payout transaction not found');
    }

    if (payoutTransaction.status !== PayoutStatus.PROCESSING) {
      throw new BadRequestException(
        `Payout transaction must be in PROCESSING state to execute. Current status: ${payoutTransaction.status}`
      );
    }

    const { payoutRequest } = payoutTransaction;

    // Determine provider from method
    const provider = this.determineProvider(payoutRequest.method);
    if (!provider) {
      throw new BadRequestException(`No provider available for payout method: ${payoutRequest.method}`);
    }

    // Check if provider is enabled
    const providerSettings = await this.providerSettings.findOne(provider);
    if (!providerSettings.enabled) {
      throw new BadRequestException(`Payment provider ${provider} is not enabled`);
    }

    // Validate user payout profile
    if (payoutRequest.wallet.ownerType !== OwnerType.USER) {
      throw new BadRequestException('Only user wallets supported');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payoutRequest.wallet.ownerId },
      include: { paymentProfile: true }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get gateway handler
    const gateway = this.payoutGatewayRegistry.get(provider);

    // Prepare recipient details from payout account
    const recipientDetails = this.prepareRecipientDetails(
      payoutRequest.method,
      payoutRequest.payoutAccount.detailsJson as Record<string, unknown>,
      user.paymentProfile
    );

    // Validate recipient
    const isValidRecipient = await gateway.validateRecipient(payoutRequest.method, recipientDetails);
    if (!isValidRecipient) {
      throw new BadRequestException('Invalid recipient details for payout');
    }

    // Execute payout
    const reference = payoutTransaction.gatewayRef || `PAYOUT-${payoutTransaction.id}`;
    const executionResult = await gateway.executePayout({
      payoutTransactionId: payoutTransaction.id,
      amountCents: payoutTransaction.amountCents,
      currency: payoutTransaction.currency,
      method: payoutTransaction.method,
      recipientDetails,
      reference
    });

    // Handle execution result
    return await this.prisma.$transaction(async (tx) => {
      if (executionResult.result === PayoutExecutionResult.SUCCESS) {
        // Mark as PAID
        await tx.payoutRequest.update({
          where: { id: payoutRequest.id },
          data: { status: PayoutStatus.PAID }
        });

        await tx.payoutTransaction.update({
          where: { id: payoutTransaction.id },
          data: {
            status: PayoutStatus.PAID,
            gatewayRef: executionResult.gatewayRef || reference,
            metadata: executionResult.metadata || undefined
          }
        });

        await this.audit.log({
          action: 'payout.executed',
          actorId,
          targetType: 'payoutTransaction',
          targetId: payoutTransaction.id,
          metadata: {
            provider,
            gatewayRef: executionResult.gatewayRef,
            result: 'SUCCESS'
          }
        });

        return { success: true, gatewayRef: executionResult.gatewayRef };
      } else {
        // Revert PROCESSING debit via compensating CREDIT entry
        await this.ledger.credit(
          payoutRequest.wallet.ownerId,
          payoutTransaction.amountCents,
          payoutTransaction.currency,
          WalletLedgerSourceType.ADJUSTMENT,
          payoutTransaction.id
        );

        // Mark as FAILED
        await tx.payoutRequest.update({
          where: { id: payoutRequest.id },
          data: { status: PayoutStatus.FAILED }
        });

        await tx.payoutTransaction.update({
          where: { id: payoutTransaction.id },
          data: {
            status: PayoutStatus.FAILED,
            failureReason: executionResult.failureReason || 'Payout execution failed',
            metadata: executionResult.metadata || undefined
          }
        });

        await this.audit.log({
          action: 'payout.failed',
          actorId,
          targetType: 'payoutTransaction',
          targetId: payoutTransaction.id,
          metadata: {
            provider,
            failureReason: executionResult.failureReason,
            result: executionResult.result
          }
        });

        throw new BadRequestException(
          `Payout execution failed: ${executionResult.failureReason || 'Unknown error'}`
        );
      }
    });
  }

  /**
   * Determine payment provider from payout method
   */
  private determineProvider(method: PayoutMethod): PaymentProvider | null {
    // For Zimbabwe, ECOCASH and BANK use Paynow
    if (method === PayoutMethod.ECOCASH || method === PayoutMethod.BANK) {
      return PaymentProvider.PAYNOW;
    }
    // WALLET is internal, no provider needed
    if (method === PayoutMethod.WALLET) {
      return null;
    }
    return null;
  }

  /**
   * Prepare recipient details from payout account and user payment profile
   */
  private prepareRecipientDetails(
    method: PayoutMethod,
    payoutAccountDetails: Record<string, unknown>,
    paymentProfile?: { paypalEmail?: string | null } | null
  ): Record<string, unknown> {
    const details: Record<string, unknown> = { ...payoutAccountDetails };

    // Add PayPal email if available
    if (paymentProfile?.paypalEmail) {
      details.paypalEmail = paymentProfile.paypalEmail;
    }

    return details;
  }

  private async getMinimumPayout(ownerType: OwnerType): Promise<number> {
    // In production, this would be configurable per role
    const config = await this.prisma.appConfig.findUnique({
      where: { key: `minPayout_${ownerType}` }
    });

    if (config) {
      const value = config.jsonValue as { amountCents?: number };
      return value.amountCents ?? 1000; // Default $10.00
    }

    return 1000; // Default minimum $10.00
  }

  async calculateRevenueSplit(
    amountCents: number,
    itemType: string
  ): Promise<{
    platformCents: number;
    agentCents?: number;
    referralCents?: number;
    rewardPoolCents?: number;
  }> {
    try {
      const pricing = await this.pricing.calculatePrice(itemType as ChargeableItemType);
      return {
        platformCents: pricing.commissionCents + pricing.platformFeeCents,
        agentCents: pricing.agentShareCents,
        referralCents: pricing.referralShareCents,
        rewardPoolCents: pricing.rewardPoolShareCents
      };
    } catch {
      // Default split if no pricing rule
      return {
        platformCents: Math.round(amountCents * 0.1), // 10% platform
        agentCents: Math.round(amountCents * 0.7), // 70% agent
        referralCents: Math.round(amountCents * 0.1), // 10% referral
        rewardPoolCents: Math.round(amountCents * 0.1) // 10% reward pool
      };
    }
  }
}

