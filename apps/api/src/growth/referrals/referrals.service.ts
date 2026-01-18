import { Injectable, BadRequestException, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { customAlphabet } from "nanoid";
import { PricingService } from "../../pricing/pricing.service";
import { RewardsService } from "../../rewards/rewards.service";
import { Currency, Role } from "@prisma/client";

@Injectable()
export class ReferralsService {
  private readonly logger = new Logger(ReferralsService.name);
  private nanoid = customAlphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", 6);

  constructor(
    private prisma: PrismaService,
    private pricingService: PricingService,
    private rewardsService: RewardsService,
  ) {}

  /**
   * Ensure user has a referral code
   * Note: referralCode model doesn't exist in schema, using AppConfig instead
   */
  async getOrCreateMyCode(userId: string, prefix?: string) {
    // Note: referralCode model doesn't exist, generating in-memory code
    const suffix = this.nanoid();
    const code = prefix
      ? `${prefix.toUpperCase().slice(0, 4)}-${suffix}`
      : `REF-${suffix}`;

    // Store in AppConfig for simplicity
    const existing = await this.prisma.appConfig.findUnique({
      where: { key: `REFERRAL_CODE_${userId}` },
    });

    if (existing) {
      return { id: "placeholder", code: (existing.jsonValue as any).code };
    }

    await this.prisma.appConfig.create({
      data: {
        key: `REFERRAL_CODE_${userId}`,
        jsonValue: { code, ownerId: userId, usageCount: 0 },
      },
    });

    return { id: "placeholder", code };
  }

  /**
   * Called during User Registration
   * Note: referral model and enums don't exist, simplified tracking
   */
  async trackSignup(params: {
    userId: string;
    referralCode: string;
    ipAddress?: string;
    deviceId?: string;
  }) {
    const { userId, referralCode, ipAddress, deviceId } = params;

    // 1. Validate Code
    const refConfig = await this.prisma.appConfig.findUnique({
      where: { key: `REFERRAL_CODE_${referralCode}` },
    });

    if (!refConfig) {
      this.logger.warn(`Invalid referral code used: ${referralCode}`);
      return;
    }

    const refData = refConfig.jsonValue as any;

    // 2. Fraud Safety: Self-Referral
    if (refData.ownerId === userId) {
      this.logger.warn(`User ${userId} attempted self-referral`);
      return;
    }

    try {
      // Note: referral model doesn't exist, just updating usage
      await this.prisma.appConfig.update({
        where: { key: `REFERRAL_CODE_${referralCode}` },
        data: {
          jsonValue: { ...refData, usageCount: (refData.usageCount || 0) + 1 },
        },
      });

      return { id: "placeholder" };
    } catch (e) {
      this.logger.error(`Failed to track signup referral for ${userId}`, e);
    }
  }

  /**
   * Transition PENDING -> QUALIFIED
   * Note: Simplified as referral model doesn't exist
   */
  async qualifyReferral(refereeId: string) {
    this.logger.warn(
      `referral model not found in schema, skipping qualification`,
    );
    return null;
  }

  /**
   * Transition QUALIFIED -> REWARDED
   * Note: Simplified as referral model doesn't exist
   */
  async distributeReward(referralId: string) {
    this.logger.warn(
      `referral model not found in schema, skipping reward distribution`,
    );
    return null;
  }

  /**
   * Stats for User Profile
   * Note: Simplified as referral model doesn't exist
   */
  async getMyStats(userId: string) {
    this.logger.warn(
      `referral model not found in schema, returning placeholder stats`,
    );
    return {
      invites: 0,
      earnedCents: 0,
      currency: Currency.USD,
    };
  }

  /**
   * List of invited users for User Profile
   * Note: Simplified as referral model doesn't exist
   */
  async getInvitedUsers(userId: string) {
    this.logger.warn(
      `referral model not found in schema, returning empty list`,
    );
    return [];
  }

  /**
   * Admin: Get all referrals for monitoring
   * Note: Simplified as referral model doesn't exist
   */
  async getAllReferrals() {
    this.logger.warn(
      `referral model not found in schema, returning empty list`,
    );
    return [];
  }
}
