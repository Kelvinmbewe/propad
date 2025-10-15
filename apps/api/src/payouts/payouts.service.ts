import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PayoutStatus, Role } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { RequestPayoutDto } from './dto/request-payout.dto';
import { ApprovePayoutDto } from './dto/approve-payout.dto';
import { PayoutWebhookDto } from './dto/payout-webhook.dto';

interface AuthContext {
  userId: string;
  role: Role;
}

@Injectable()
export class PayoutsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async request(dto: RequestPayoutDto, actor: AuthContext) {
    if (actor.role === Role.AGENT && actor.userId !== dto.agentId) {
      throw new ForbiddenException('Cannot request payouts for another agent');
    }

    const payout = await this.prisma.payout.create({
      data: {
        agentId: dto.agentId,
        amountUsdCents: dto.amountUsdCents,
        method: dto.method,
        status: PayoutStatus.PENDING
      }
    });

    await this.audit.log({
      action: 'payout.request',
      actorId: actor.userId,
      targetType: 'payout',
      targetId: payout.id,
      metadata: { amountUsdCents: dto.amountUsdCents }
    });

    return payout;
  }

  async approve(id: string, dto: ApprovePayoutDto, actor: AuthContext) {
    const payout = await this.getPayout(id);
    if (payout.status !== PayoutStatus.PENDING) {
      throw new ForbiddenException('Payout already processed');
    }

    const updated = await this.prisma.payout.update({
      where: { id },
      data: { txRef: dto.txRef }
    });

    await this.audit.log({
      action: 'payout.approve',
      actorId: actor.userId,
      targetType: 'payout',
      targetId: id,
      metadata: { txRef: dto.txRef }
    });

    return updated;
  }

  async markPaid(id: string, actor: AuthContext) {
    const payout = await this.getPayout(id);

    const updated = await this.prisma.payout.update({
      where: { id },
      data: { status: PayoutStatus.PAID }
    });

    await this.audit.log({
      action: 'payout.markPaid',
      actorId: actor.userId,
      targetType: 'payout',
      targetId: id
    });

    return updated;
  }

  async handleWebhook(dto: PayoutWebhookDto) {
    const payout = await this.prisma.payout.findFirst({ where: { txRef: dto.txRef } });
    if (!payout) {
      throw new NotFoundException('Payout not found for webhook');
    }

    const updated = await this.prisma.payout.update({
      where: { id: payout.id },
      data: { status: dto.status }
    });

    await this.audit.log({
      action: 'payout.webhook',
      actorId: null,
      targetType: 'payout',
      targetId: payout.id,
      metadata: { status: dto.status }
    });

    return updated;
  }

  private async getPayout(id: string) {
    const payout = await this.prisma.payout.findUnique({ where: { id } });
    if (!payout) {
      throw new NotFoundException('Payout not found');
    }
    return payout;
  }
}
