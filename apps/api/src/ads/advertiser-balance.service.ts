import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import {
  Prisma,
  PrismaClient,
  WalletLedgerSourceType,
  Currency,
} from "@prisma/client";
import { WalletLedgerService } from "../wallets/wallet-ledger.service";

type PrismaClientOrTx = PrismaClient | Prisma.TransactionClient;

interface DeductResult {
  success: boolean;
  newBalance: number;
  deductedAmount: number;
}

@Injectable()
export class AdvertiserBalanceService {
  private readonly logger = new Logger(AdvertiserBalanceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly ledger: WalletLedgerService,
  ) {}

  private async getOwnerId(advertiserId: string): Promise<string> {
    const advertiser = await this.prisma.advertiser.findUnique({
      where: { id: advertiserId },
      select: { ownerId: true, contactEmail: true },
    });
    if (!advertiser) {
      throw new NotFoundException(`Advertiser ${advertiserId} not found`);
    }

    if (advertiser.ownerId) {
      return advertiser.ownerId;
    }

    if (advertiser.contactEmail) {
      const owner = await this.prisma.user.findUnique({
        where: { email: advertiser.contactEmail },
        select: { id: true },
      });
      if (owner?.id) {
        await this.prisma.advertiser.update({
          where: { id: advertiserId },
          data: { ownerId: owner.id },
        });
        return owner.id;
      }
    }

    throw new NotFoundException(
      `Advertiser ${advertiserId} has no linked owner`,
    );
  }

  async getAdvertiserOwnerId(advertiserId: string): Promise<string> {
    return this.getOwnerId(advertiserId);
  }

  /**
   * Get advertiser balance
   */
  async getBalance(advertiserId: string): Promise<{ balanceCents: number }> {
    const ownerId = await this.getOwnerId(advertiserId);
    // Assuming USD for now
    const balance = await this.ledger.calculateBalance(ownerId, Currency.USD);
    return { balanceCents: balance.withdrawableCents };
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
    const ownerId = await this.getOwnerId(advertiserId);

    await this.ledger.credit(
      ownerId,
      amountCents,
      Currency.USD,
      WalletLedgerSourceType.ADJUSTMENT, // Or new TOPUP type?
      referenceId || `TOPUP-${Date.now()}`,
      "Advertiser Top Up",
    );

    if (actorId) {
      await this.audit.logAction({
        action: "advertiser.balance.topup",
        actorId,
        targetType: "advertiser",
        targetId: advertiserId,
        metadata: { amountCents },
      });
    }

    return this.getBalance(advertiserId);
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
    return this.deductBalance(
      advertiserId,
      costCents,
      "IMPRESSION",
      campaignId,
      referenceId,
    );
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
    return this.deductBalance(
      advertiserId,
      costCents,
      "CLICK",
      campaignId,
      referenceId,
    );
  }

  /**
   * Generic deduct balance (atomic, no negative balances)
   */
  private async deductBalance(
    advertiserId: string,
    amountCents: number,
    reason: "IMPRESSION" | "CLICK" | "REFUND",
    campaignId?: string,
    referenceId?: string,
  ): Promise<DeductResult> {
    if (amountCents <= 0) {
      const current = await this.getBalance(advertiserId);
      return {
        success: true,
        newBalance: current.balanceCents,
        deductedAmount: 0,
      };
    }

    const ownerId = await this.getOwnerId(advertiserId);

    try {
      await this.ledger.debit(
        ownerId,
        amountCents,
        Currency.USD,
        WalletLedgerSourceType.AD_SPEND,
        referenceId || campaignId || "unknown",
        `${reason} on Campaign ${campaignId}`,
      );

      // Update campaign spent amount if provided (Maintain for stats)
      if (campaignId) {
        await this.prisma.adCampaign.update({
          where: { id: campaignId },
          data: { spentCents: { increment: amountCents } },
        });
      }

      const current = await this.getBalance(advertiserId);
      return {
        success: true,
        newBalance: current.balanceCents,
        deductedAmount: amountCents,
      };
    } catch (e) {
      // Insufficient funds or other error
      if (e instanceof BadRequestException) {
        // Trigger auto-pause if funds low
        await this.autoPauseCampaigns(advertiserId);
        const current = await this.getBalance(advertiserId);
        return {
          success: false,
          newBalance: current.balanceCents,
          deductedAmount: 0,
        };
      }
      throw e;
    }
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
        status: "ACTIVE",
      },
      data: {
        status: "PAUSED",
      },
    });

    if (result.count > 0) {
      await this.audit.logAction({
        action: "advertiser.campaigns.auto-paused",
        actorId: undefined,
        targetType: "advertiser",
        targetId: advertiserId,
        metadata: { pausedCount: result.count, reason: "INSUFFICIENT_BALANCE" },
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
   * @deprecated Use LedgerService instead
   */
  async getBalanceLogs(advertiserId: string, limit: number = 50) {
    // Fallback or empty? Or map Ledger Entries?
    // Let's return empty for now as we are moving away from this table.
    return [];
  }

  /**
   * Refund to advertiser balance (for failed impressions/clicks)
   */
  async refund(
    advertiserId: string,
    amountCents: number,
    referenceId?: string,
  ): Promise<{ balanceCents: number }> {
    const ownerId = await this.getOwnerId(advertiserId);

    await this.ledger.credit(
      ownerId,
      amountCents,
      Currency.USD,
      WalletLedgerSourceType.ADJUSTMENT, // AD_REFUND doesn't exist, use ADJUSTMENT
      referenceId || `REFUND-${Date.now()}`,
      "Refund",
    );

    return this.getBalance(advertiserId);
  }
}
