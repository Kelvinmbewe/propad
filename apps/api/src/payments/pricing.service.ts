import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ChargeableItemType } from '@propad/config';
import { Currency, Prisma } from '@prisma/client';
// import { ChargeableItemType, Currency, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

export interface PricingBreakdown {
  basePriceUsdCents: number;
  currency: Currency;
  priceCents: number;
  commissionCents: number;
  platformFeeCents: number;
  agentShareCents?: number;
  referralShareCents?: number;
  rewardPoolShareCents?: number;
  totalCents: number;
}

@Injectable()
export class PricingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) { }

  async getPricingRule(itemType: ChargeableItemType, allowInactive = false) {
    const rule = await this.prisma.pricingRule.findUnique({
      where: { itemType }
    });
    if (!rule) {
      throw new NotFoundException(`Pricing rule not found for ${itemType}`);
    }
    if (!allowInactive && !rule.isActive) {
      throw new BadRequestException(`Pricing rule for ${itemType} is inactive`);
    }
    return rule;
  }

  async getAllPricingRules() {
    return this.prisma.pricingRule.findMany({
      orderBy: { itemType: 'asc' }
    });
  }

  async calculatePrice(
    itemType: ChargeableItemType,
    baseAmountUsdCents?: number,
    currency: Currency = Currency.USD
  ): Promise<PricingBreakdown> {
    const rule = await this.getPricingRule(itemType);
    const basePrice = baseAmountUsdCents ?? rule.priceUsdCents;

    // Convert to target currency if needed (simplified - in production use FX rates)
    const priceCents = currency === Currency.USD ? basePrice : basePrice; // TODO: Add FX conversion

    // Calculate splits
    const commissionCents = Math.round(
      (priceCents * Number(rule.commissionPercent)) / 100
    );
    const platformFeeCents = Math.round(
      (priceCents * Number(rule.platformFeePercent)) / 100
    );
    const agentShareCents = rule.agentSharePercent
      ? Math.round((priceCents * Number(rule.agentSharePercent)) / 100)
      : undefined;
    const referralShareCents = rule.referralSharePercent
      ? Math.round((priceCents * Number(rule.referralSharePercent)) / 100)
      : undefined;
    const rewardPoolShareCents = rule.rewardPoolSharePercent
      ? Math.round((priceCents * Number(rule.rewardPoolSharePercent)) / 100)
      : undefined;

    const totalCents = priceCents + commissionCents + platformFeeCents;

    return {
      basePriceUsdCents: basePrice,
      currency,
      priceCents,
      commissionCents,
      platformFeeCents,
      agentShareCents,
      referralShareCents,
      rewardPoolShareCents,
      totalCents
    };
  }

  async createOrUpdatePricingRule(
    itemType: ChargeableItemType,
    data: {
      priceUsdCents: number;
      currency?: Currency;
      commissionPercent?: number;
      platformFeePercent?: number;
      agentSharePercent?: number;
      referralSharePercent?: number;
      rewardPoolSharePercent?: number;
      isActive?: boolean;
      metadata?: Prisma.InputJsonValue;
    },
    actorId: string
  ) {
    const rule = await this.prisma.pricingRule.upsert({
      where: { itemType },
      create: {
        itemType,
        priceUsdCents: data.priceUsdCents,
        currency: data.currency ?? Currency.USD,
        commissionPercent: data.commissionPercent ?? 0,
        platformFeePercent: data.platformFeePercent ?? 0,
        agentSharePercent: data.agentSharePercent,
        referralSharePercent: data.referralSharePercent,
        rewardPoolSharePercent: data.rewardPoolSharePercent,
        isActive: data.isActive ?? true,
        metadata: data.metadata
      },
      update: {
        priceUsdCents: data.priceUsdCents,
        currency: data.currency,
        commissionPercent: data.commissionPercent,
        platformFeePercent: data.platformFeePercent,
        agentSharePercent: data.agentSharePercent,
        referralSharePercent: data.referralSharePercent,
        rewardPoolSharePercent: data.rewardPoolSharePercent,
        isActive: data.isActive,
        metadata: data.metadata
      }
    });

    await this.audit.log({
      action: 'pricingRule.updated',
      actorId,
      targetType: 'pricingRule',
      targetId: itemType,
      metadata: { priceUsdCents: rule.priceUsdCents, isActive: rule.isActive }
    });

    return rule;
  }

  async toggleActive(itemType: ChargeableItemType, isActive: boolean, actorId: string) {
    const rule = await this.getPricingRule(itemType);
    const updated = await this.prisma.pricingRule.update({
      where: { itemType },
      data: { isActive }
    });

    await this.audit.log({
      action: isActive ? 'pricingRule.activated' : 'pricingRule.deactivated',
      actorId,
      targetType: 'pricingRule',
      targetId: itemType
    });

    return updated;
  }
}

