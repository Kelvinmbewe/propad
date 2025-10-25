import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { OwnerType, PaymentMethodStatus, Role } from '@prisma/client';
import { env } from '@propad/config';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';
import { UpdatePaymentMethodStatusDto } from './dto/update-payment-method-status.dto';

interface ActorContext {
  userId: string;
  role: Role;
}

interface OwnerContext {
  ownerType: OwnerType;
  ownerId: string;
}

const AML_BLOCKLIST_PREFIX = 'wallet.aml.blocklist.';

@Injectable()
export class PaymentMethodsService {
  private readonly envBlocklist: Set<string>;

  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {
    this.envBlocklist = new Set(
      (env.PAYMENT_METHOD_BLOCKLIST ?? '')
        .split(',')
        .map((entry: string) => entry.trim())
        .filter((entry: string): entry is string => entry.length > 0)
        .map((entry: string) => this.normalizeReference(entry))
    );
  }

  async listMethods(actor: ActorContext) {
    const owner = this.resolveOwner(actor);
    return this.prisma.paymentMethod.findMany({
      where: { ownerType: owner.ownerType, ownerId: owner.ownerId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }]
    });
  }

  async createMethod(dto: CreatePaymentMethodDto, actor: ActorContext) {
    const owner = this.resolveOwner(actor);
    await this.ensureNotBlocked(dto.gatewayRef ?? dto.last4 ?? null);

    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.paymentMethod.updateMany({
          where: { ownerType: owner.ownerType, ownerId: owner.ownerId, isDefault: true },
          data: { isDefault: false }
        });
      }

      const method = await tx.paymentMethod.create({
        data: {
          ownerType: owner.ownerType,
          ownerId: owner.ownerId,
          type: dto.type,
          gatewayRef: dto.gatewayRef ?? null,
          brand: dto.brand ?? null,
          last4: dto.last4 ?? null,
          expMonth: dto.expMonth ?? null,
          expYear: dto.expYear ?? null,
          isDefault: dto.isDefault ?? false,
          status: PaymentMethodStatus.ACTIVE,
          recurringConsentAt: dto.recurringConsent ? new Date() : null,
          recurringConsentActorId: dto.recurringConsent ? actor.userId : null
        }
      });

      await tx.paymentMethodStatusLog.create({
        data: {
          paymentMethodId: method.id,
          fromStatus: null,
          toStatus: PaymentMethodStatus.ACTIVE,
          reason: 'created',
          actorId: actor.userId
        }
      });

      await this.audit.log({
        action: 'payments.method.create',
        actorId: actor.userId,
        targetType: 'paymentMethod',
        targetId: method.id,
        metadata: { type: dto.type }
      });

      return method;
    });
  }

  async setDefault(id: string, actor: ActorContext) {
    const method = await this.prisma.paymentMethod.findUnique({ where: { id } });
    if (!method) {
      throw new NotFoundException('Payment method not found');
    }
    const owner = this.resolveOwner(actor);
    this.assertOwner(owner, method);

    if (method.status !== PaymentMethodStatus.ACTIVE) {
      throw new BadRequestException('Only active payment methods can be made default');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.paymentMethod.updateMany({
        where: { ownerType: owner.ownerType, ownerId: owner.ownerId, isDefault: true },
        data: { isDefault: false }
      });
      return tx.paymentMethod.update({ where: { id }, data: { isDefault: true } });
    });
  }

  async updateStatus(id: string, dto: UpdatePaymentMethodStatusDto, actor: ActorContext) {
    const method = await this.prisma.paymentMethod.findUnique({ where: { id } });
    if (!method) {
      throw new NotFoundException('Payment method not found');
    }

    if (method.status === dto.status) {
      return method;
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.paymentMethod.update({
        where: { id },
        data: { status: dto.status, isDefault: dto.status === PaymentMethodStatus.ACTIVE ? method.isDefault : false }
      });

      await tx.paymentMethodStatusLog.create({
        data: {
          paymentMethodId: id,
          fromStatus: method.status,
          toStatus: dto.status,
          reason: dto.reason ?? null,
          actorId: actor.userId
        }
      });

      await this.audit.log({
        action: 'payments.method.status',
        actorId: actor.userId,
        targetType: 'paymentMethod',
        targetId: id,
        metadata: { from: method.status, to: dto.status, reason: dto.reason }
      });

      return updated;
    });
  }

  async updateRecurringConsent(id: string, consent: boolean, actor: ActorContext) {
    const method = await this.prisma.paymentMethod.findUnique({ where: { id } });
    if (!method) {
      throw new NotFoundException('Payment method not found');
    }
    const owner = this.resolveOwner(actor);
    this.assertOwner(owner, method);

    const data = consent
      ? { recurringConsentAt: new Date(), recurringConsentActorId: actor.userId }
      : { recurringConsentAt: null, recurringConsentActorId: null };

    return this.prisma.paymentMethod.update({ where: { id }, data });
  }

  private resolveOwner(actor: ActorContext): OwnerContext {
    if (actor.role === Role.ADMIN) {
      throw new ForbiddenException('Administrators cannot store payment methods');
    }
    return { ownerType: OwnerType.USER, ownerId: actor.userId };
  }

  private assertOwner(owner: OwnerContext, method: { ownerType: OwnerType; ownerId: string }) {
    if (method.ownerType !== owner.ownerType || method.ownerId !== owner.ownerId) {
      throw new ForbiddenException('Payment method does not belong to caller');
    }
  }

  private async ensureNotBlocked(reference: string | null) {
    if (!reference) {
      return;
    }

    const normalized = this.normalizeReference(reference);
    if (this.envBlocklist.has(normalized)) {
      throw new BadRequestException('Payment method is not allowed');
    }

    const dynamic = await this.loadDynamicBlocklist();
    if (dynamic.has(normalized)) {
      throw new BadRequestException('Payment method is not allowed');
    }
  }

  private async loadDynamicBlocklist() {
    const flags = await this.prisma.featureFlag.findMany({
      where: { key: { startsWith: AML_BLOCKLIST_PREFIX } }
    });

    const values = flags.map((flag: { key: string; description: string | null }) => {
      if (flag.description) {
        try {
          const parsed = JSON.parse(flag.description) as { normalized?: string; value?: string };
          if (typeof parsed.normalized === 'string' && parsed.normalized.length > 0) {
            return parsed.normalized;
          }
          if (typeof parsed.value === 'string') {
            return this.normalizeReference(parsed.value);
          }
        } catch (error) {
          return flag.key.replace(AML_BLOCKLIST_PREFIX, '');
        }
      }
      return flag.key.replace(AML_BLOCKLIST_PREFIX, '');
    });

    return new Set(values.map((value: string) => this.normalizeReference(value)));
  }

  private normalizeReference(reference: string) {
    return reference.replace(/[\s+\-]/g, '').toLowerCase();
  }
}
