import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { PricingService } from "../pricing/pricing.service";

export interface IncentivesManifest {
  version: number;
  generatedAt: Date;
  rewardSources: {
    source: string;
    description: string;
    configKey?: string;
  }[];
  splitRules: {
    key: string;
    value: any;
    scope: string;
    description?: string;
  }[];
  capsAndLimits: {
    name: string;
    value: number | string;
    type: "RATE_LIMIT" | "COOLDOWN" | "CAP" | "THRESHOLD";
    description: string;
  }[];
  rewardPools: {
    name: string;
    totalUsdCents: number;
    spentUsdCents: number;
    isActive: boolean;
  }[];
}

@Injectable()
export class IncentivesManifestService {
  private readonly logger = new Logger(IncentivesManifestService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pricingService: PricingService,
  ) {}

  /**
   * Generate current incentives manifest
   */
  async generateManifest(): Promise<IncentivesManifest> {
    // Get all pricing configs related to incentives
    const configs = await this.pricingService.getAllConfigs();
    const incentiveConfigs = configs.filter(
      (c: { key: string }) =>
        c.key.includes("REWARD") ||
        c.key.includes("COMMISSION") ||
        c.key.includes("REFERRAL") ||
        c.key.includes("SHARE") ||
        c.key.includes("SPLIT"),
    );

    // Get active reward pools
    const pools = await this.prisma.rewardPool.findMany({
      select: {
        name: true,
        totalUsdCents: true,
        spentUsdCents: true,
        isActive: true,
      },
    });

    // Note: incentivesManifest model doesn't exist in schema
    // Generate version number based on time instead of database
    const nextVersion = Math.floor(Date.now() / 1000);

    const manifest: IncentivesManifest = {
      version: nextVersion,
      generatedAt: new Date(),
      rewardSources: [
        {
          source: "REWARD",
          description: "Platform rewards from verification, deals, bonuses",
          configKey: "REWARD_*",
        },
        {
          source: "COMMISSION",
          description: "Agent commissions from transactions",
          configKey: "COMMISSION_*",
        },
        {
          source: "REFERRAL",
          description: "Referral bonuses for user signups",
          configKey: "REWARD_REFERRAL_*",
        },
        {
          source: "AD_REVENUE_SHARE",
          description: "Revenue share from advertising",
          configKey: "REWARD_SPLIT",
        },
      ],
      splitRules: incentiveConfigs.map(
        (c: {
          key: string;
          value: any;
          scope: string;
          description: string | null;
        }) => ({
          key: c.key,
          value: c.value,
          scope: c.scope,
          description: c.description || undefined,
        }),
      ),
      capsAndLimits: [
        {
          name: "Reward Recalculation Rate",
          value: "10/hour per admin",
          type: "RATE_LIMIT",
          description: "Maximum reward recalculation requests per admin",
        },
        {
          name: "Manual Payout Rate",
          value: "50/hour per admin",
          type: "RATE_LIMIT",
          description: "Maximum manual payout operations per admin",
        },
        {
          name: "Referral Resolution Rate",
          value: "100/minute global",
          type: "RATE_LIMIT",
          description: "Maximum referral resolutions per minute system-wide",
        },
        {
          name: "Deal Reward Cooldown",
          value: "24 hours per property",
          type: "COOLDOWN",
          description: "Cooldown between deal rewards for same property",
        },
        {
          name: "Referral Reward Cooldown",
          value: "1 hour per user",
          type: "COOLDOWN",
          description: "Cooldown between referral rewards for same user",
        },
      ],
      rewardPools: pools,
    };

    return manifest;
  }

  /**
   * Save manifest snapshot for audit
   * Note: incentivesManifest model doesn't exist, so this returns a placeholder
   */
  async saveManifestSnapshot(
    generatedBy?: string,
  ): Promise<{ id: string; version: number }> {
    const manifest = await this.generateManifest();

    // Note: Database model doesn't exist, returning placeholder
    this.logger.warn(
      `incentivesManifest model not found in schema, skipping database save`,
    );
    this.logger.log(
      `Generated incentives manifest snapshot v${manifest.version}`,
    );

    return { id: "placeholder-id", version: manifest.version };
  }

  /**
   * Get manifest history
   * Note: incentivesManifest model doesn't exist, returns empty array
   */
  async getManifestHistory(limit: number = 10) {
    this.logger.warn(
      `incentivesManifest model not found in schema, returning empty history`,
    );
    return [];
  }

  /**
   * Get specific manifest version
   * Note: incentivesManifest model doesn't exist, returns null
   */
  async getManifestVersion(version: number) {
    this.logger.warn(
      `incentivesManifest model not found in schema, returning null`,
    );
    return null;
  }
}
