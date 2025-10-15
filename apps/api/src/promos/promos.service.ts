import { Injectable, NotFoundException } from '@nestjs/common';
import { Currency, InvoicePurpose, PromoTier } from '@prisma/client';
import { isWithinInterval } from 'date-fns';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePromoDto } from './dto/create-promo.dto';
import { PromoRebateDto } from './dto/promo-rebate.dto';
import { PaymentsService } from '../payments/payments.service';

@Injectable()
export class PromosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly payments: PaymentsService
  ) {}

  async create(dto: CreatePromoDto) {
    const { promo, invoice } = await this.prisma.$transaction(async (tx) => {
      const created = await tx.promoBoost.create({
        data: {
          agentId: dto.agentId,
          propertyId: dto.propertyId,
          tier: dto.tier,
          startAt: dto.startAt,
          endAt: dto.endAt,
          usdCents: dto.usdCents
        }
      });

      const createdInvoice = await this.payments.createInvoice(
        {
          buyerUserId: dto.agentId,
          purpose: InvoicePurpose.PROMO_BOOST,
          currency: Currency.USD,
          lines: [
            {
              sku: `PROMO_${dto.tier}`,
              description: `Promo boost ${dto.tier}`,
              qty: 1,
              unitPriceCents: dto.usdCents,
              taxable: true
            }
          ],
          link: { promoBoostId: created.id }
        },
        tx
      );

      return { promo: created, invoice: createdInvoice };
    });

    await this.audit.log({
      action: 'promo.create',
      actorId: dto.agentId,
      targetType: 'promo',
      targetId: promo.id,
      metadata: { tier: dto.tier, invoiceId: invoice.id }
    });

    return { promo, invoice };
  }

  async activate(id: string) {
    const promo = await this.prisma.promoBoost.findUnique({ where: { id }, include: { property: true } });
    if (!promo) {
      throw new NotFoundException('Promo not found');
    }

    const now = new Date();
    const updated = await this.prisma.promoBoost.update({
      where: { id },
      data: {
        startAt: now,
        endAt: promo.endAt < now ? new Date(now.getTime() + 7 * 24 * 3600 * 1000) : promo.endAt
      }
    });

    await this.audit.log({
      action: 'promo.activate',
      actorId: promo.agentId,
      targetType: 'promo',
      targetId: id
    });

    return updated;
  }

  async suburbSortingEffect() {
    const now = new Date();
    const promos = await this.prisma.promoBoost.findMany({
      include: {
        property: {
          include: {
            suburb: true
          }
        }
      }
    });

    const counts = promos.reduce<Record<string, { tier: PromoTier; count: number }>>((acc, promo) => {
      const suburbName = promo.property?.suburb?.name;
      if (!promo.property || !suburbName) {
        return acc;
      }

      if (!isWithinInterval(now, { start: promo.startAt, end: promo.endAt })) {
        return acc;
      }

      const existing = acc[suburbName];
      acc[suburbName] = {
        tier: promo.tier,
        count: (existing?.count ?? 0) + 1
      };
      return acc;
    }, {});

    return Object.entries(counts)
      .map(([suburb, value]) => ({ suburb, tier: value.tier, count: value.count }))
      .sort((a, b) => b.count - a.count);
  }

  async logRebate(id: string, dto: PromoRebateDto) {
    const promo = await this.prisma.promoBoost.findUnique({ where: { id } });
    if (!promo) {
      throw new NotFoundException('Promo not found');
    }

    await this.audit.log({
      action: 'promo.rebate',
      actorId: promo.agentId,
      targetType: 'promo',
      targetId: id,
      metadata: { amountUsdCents: dto.amountUsdCents, reason: dto.reason }
    });

    return { success: true };
  }
}
