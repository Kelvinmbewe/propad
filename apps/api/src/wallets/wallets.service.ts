import { randomUUID } from 'crypto';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import {
  Currency,
  KycStatus,
  OwnerType,
  PayoutStatus,
  Prisma,
  Role,
  Wallet,
  WalletTransactionSource,
  WalletTransactionType
} from '@prisma/client';
import { addDays, startOfDay } from 'date-fns';
import { env } from '@propad/config';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RequestPayoutDto } from './dto/request-payout.dto';
import { ApprovePayoutDto } from './dto/approve-payout.dto';
import { PayoutWebhookDto } from './dto/payout-webhook.dto';
import { CreatePayoutAccountDto } from './dto/create-payout-account.dto';
import { SubmitKycDto } from './dto/submit-kyc.dto';
import { UpdateKycStatusDto } from './dto/update-kyc-status.dto';
import { VerifyPayoutAccountDto } from './dto/verify-payout-account.dto';

interface AuthContext {
  userId: string;
  role: Role;
}

const DEFAULT_CURRENCY = Currency.USD;
const ACTIVE_PAYOUT_STATUSES: PayoutStatus[] = [
  PayoutStatus.REQUESTED,
  PayoutStatus.REVIEW,
  PayoutStatus.APPROVED,
  PayoutStatus.SENT
];

@Injectable()
export class WalletsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async getMyWallet(actor: AuthContext) {
    const owner = this.resolveOwner(actor);
    return this.prisma.$transaction(async (tx) => {
      const wallet = await this.getOrCreateWallet(owner.ownerType, owner.ownerId, DEFAULT_CURRENCY, tx);
      await this.releasePendingTransactions(wallet.id, tx);
      return this.buildWalletResponse(wallet.id, tx);
    });
  }

  async listTransactions(walletId: string, actor: AuthContext) {
    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { id: walletId } });
      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }
      this.assertAccess(actor, wallet);
      await this.releasePendingTransactions(wallet.id, tx);
      const transactions = await tx.walletTransaction.findMany({
        where: { walletId },
        orderBy: { createdAt: 'desc' },
        take: 100
      });
      return { walletId, transactions };
    });
  }

  async createPayoutAccount(dto: CreatePayoutAccountDto, actor: AuthContext) {
    const owner = this.resolveOwner(actor);
    return this.prisma.$transaction(async (tx) => {
      await this.getOrCreateWallet(owner.ownerType, owner.ownerId, DEFAULT_CURRENCY, tx);
      const account = await tx.payoutAccount.create({
        data: {
          ownerType: owner.ownerType,
          ownerId: owner.ownerId,
          type: dto.type,
          displayName: dto.displayName,
          detailsJson: dto.details,
          verifiedAt: null
        }
      });

      await this.audit.log({
        action: 'wallet.payoutAccount.create',
        actorId: actor.userId,
        targetType: 'payoutAccount',
        targetId: account.id,
        metadata: { type: dto.type }
      });

      return account;
    });
  }

  async verifyPayoutAccount(id: string, dto: VerifyPayoutAccountDto, actor: AuthContext) {
    const account = await this.prisma.payoutAccount.findUnique({ where: { id } });
    if (!account) {
      throw new NotFoundException('Payout account not found');
    }

    const verifiedAt = dto.verified ? new Date() : null;
    const updated = await this.prisma.payoutAccount.update({
      where: { id },
      data: { verifiedAt }
    });

    await this.audit.log({
      action: 'wallet.payoutAccount.verify',
      actorId: actor.userId,
      targetType: 'payoutAccount',
      targetId: id,
      metadata: { verified: dto.verified }
    });

    return updated;
  }

  async submitKyc(dto: SubmitKycDto, actor: AuthContext) {
    const owner = this.resolveOwner(actor);
    const record = await this.prisma.kycRecord.create({
      data: {
        ownerType: owner.ownerType,
        ownerId: owner.ownerId,
        idType: dto.idType,
        idNumber: dto.idNumber,
        docUrls: dto.docUrls,
        notes: dto.notes ?? null,
        status: KycStatus.PENDING
      }
    });

    await this.audit.log({
      action: 'wallet.kyc.submit',
      actorId: actor.userId,
      targetType: 'kycRecord',
      targetId: record.id,
      metadata: { idType: dto.idType }
    });

    return record;
  }

  async updateKycStatus(id: string, dto: UpdateKycStatusDto, actor: AuthContext) {
    const record = await this.prisma.kycRecord.findUnique({ where: { id } });
    if (!record) {
      throw new NotFoundException('KYC record not found');
    }

    const updated = await this.prisma.kycRecord.update({
      where: { id },
      data: { status: dto.status, notes: dto.notes ?? null }
    });

    await this.audit.log({
      action: 'wallet.kyc.update',
      actorId: actor.userId,
      targetType: 'kycRecord',
      targetId: id,
      metadata: { status: dto.status }
    });

    return updated;
  }

  async requestPayout(dto: RequestPayoutDto, actor: AuthContext) {
    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { id: dto.walletId } });
      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }
      this.assertAccess(actor, wallet);

      await this.releasePendingTransactions(wallet.id, tx);

      if (wallet.currency !== DEFAULT_CURRENCY) {
        throw new BadRequestException('Unsupported wallet currency');
      }

      if (dto.amountCents < env.WALLET_MIN_PAYOUT_CENTS) {
        throw new BadRequestException('Amount is below minimum payout threshold');
      }

      const { _sum: reservedSum } = await tx.payoutRequest.aggregate({
        where: { walletId: wallet.id, status: { in: ACTIVE_PAYOUT_STATUSES } },
        _sum: { amountCents: true }
      });
      const reservedCents = reservedSum.amountCents ?? 0;
      const availableCents = wallet.balanceCents - reservedCents;
      if (availableCents < dto.amountCents) {
        throw new BadRequestException('Insufficient available balance for payout');
      }

      const account = await tx.payoutAccount.findUnique({ where: { id: dto.payoutAccountId } });
      if (!account || account.ownerId !== wallet.ownerId || account.ownerType !== wallet.ownerType) {
        throw new ForbiddenException('Payout account not available for this wallet');
      }
      if (!account.verifiedAt) {
        throw new BadRequestException('Payout account is not verified');
      }
      if (account.type !== dto.method) {
        throw new BadRequestException('Payout method does not match payout account');
      }

      const kycRecord = await tx.kycRecord.findFirst({
        where: { ownerId: wallet.ownerId, ownerType: wallet.ownerType },
        orderBy: { updatedAt: 'desc' }
      });
      if (!kycRecord || kycRecord.status !== KycStatus.VERIFIED) {
        throw new BadRequestException('Verified KYC is required before requesting payouts');
      }

      const start = startOfDay(new Date());
      const rateLimitCount = await tx.payoutRequest.count({
        where: {
          walletId: wallet.id,
          createdAt: { gte: start }
        }
      });
      if (rateLimitCount >= env.WALLET_MAX_PAYOUTS_PER_DAY) {
        throw new BadRequestException('Daily payout request limit reached');
      }

      const payout = await tx.payoutRequest.create({
        data: {
          walletId: wallet.id,
          amountCents: dto.amountCents,
          method: dto.method,
          payoutAccountId: dto.payoutAccountId,
          scheduledFor: dto.scheduledFor ?? null,
          status: PayoutStatus.REQUESTED
        }
      });

      await this.audit.log({
        action: 'wallet.payout.request',
        actorId: actor.userId,
        targetType: 'payoutRequest',
        targetId: payout.id,
        metadata: { amountCents: dto.amountCents }
      });

      return payout;
    });
  }

  async approvePayout(id: string, dto: ApprovePayoutDto, actor: AuthContext) {
    return this.prisma.$transaction(async (tx) => {
      const payout = await tx.payoutRequest.findUnique({ where: { id } });
      if (!payout) {
        throw new NotFoundException('Payout request not found');
      }
      if (![PayoutStatus.REQUESTED, PayoutStatus.REVIEW].includes(payout.status)) {
        throw new BadRequestException('Payout cannot be approved');
      }

      const txRef = dto.txRef ?? payout.txRef ?? randomUUID();
      const updated = await tx.payoutRequest.update({
        where: { id },
        data: {
          status: PayoutStatus.APPROVED,
          txRef,
          scheduledFor: dto.scheduledFor ?? payout.scheduledFor
        }
      });

      await this.audit.log({
        action: 'wallet.payout.approve',
        actorId: actor.userId,
        targetType: 'payoutRequest',
        targetId: id,
        metadata: { txRef }
      });

      return updated;
    });
  }

  async handleWebhook(dto: PayoutWebhookDto) {
    return this.prisma.$transaction(async (tx) => {
      const payout = await tx.payoutRequest.findFirst({ where: { txRef: dto.txRef } });
      if (!payout) {
        throw new NotFoundException('Payout not found for webhook');
      }

      if (payout.status === dto.status) {
        return payout;
      }

      const updated = await tx.payoutRequest.update({
        where: { id: payout.id },
        data: { status: dto.status }
      });

      if (dto.status === PayoutStatus.PAID) {
        await this.applyPayoutDebit(updated, tx);
      }

      if (dto.status === PayoutStatus.FAILED || dto.status === PayoutStatus.CANCELLED) {
        await this.audit.log({
          action: 'wallet.payout.failed',
          actorId: null,
          targetType: 'payoutRequest',
          targetId: payout.id,
          metadata: { reason: dto.failureReason }
        });
      } else {
        await this.audit.log({
          action: 'wallet.payout.webhook',
          actorId: null,
          targetType: 'payoutRequest',
          targetId: payout.id,
          metadata: { status: dto.status }
        });
      }

      return updated;
    });
  }

  async creditWallet(params: {
    ownerType: OwnerType;
    ownerId: string;
    currency?: Currency;
    amountCents: number;
    source: WalletTransactionSource;
    sourceId?: string;
    description?: string;
    availableAt?: Date;
  }) {
    const currency = params.currency ?? DEFAULT_CURRENCY;
    return this.prisma.$transaction(async (tx) => {
      const wallet = await this.getOrCreateWallet(params.ownerType, params.ownerId, currency, tx);
      const now = new Date();
      const availableAt = params.availableAt ?? addDays(now, env.WALLET_EARNINGS_COOL_OFF_DAYS);
      const immediate = availableAt <= now;

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          amountCents: params.amountCents,
          type: WalletTransactionType.CREDIT,
          source: params.source,
          sourceId: params.sourceId ?? null,
          description: params.description ?? null,
          availableAt,
          appliedToBalance: immediate
        }
      });

      const update: Prisma.WalletUpdateInput = immediate
        ? { balanceCents: { increment: params.amountCents } }
        : { pendingCents: { increment: params.amountCents } };

      await tx.wallet.update({ where: { id: wallet.id }, data: update });

      return wallet;
    });
  }

  private resolveOwner(actor: AuthContext): { ownerType: OwnerType; ownerId: string } {
    if (actor.role === Role.ADMIN) {
      throw new ForbiddenException('Administrators do not have personal wallets');
    }
    return { ownerType: OwnerType.USER, ownerId: actor.userId };
  }

  private assertAccess(actor: AuthContext, wallet: Wallet) {
    if (actor.role === Role.ADMIN) {
      return;
    }
    if (wallet.ownerType !== OwnerType.USER || wallet.ownerId !== actor.userId) {
      throw new ForbiddenException('Not permitted to access this wallet');
    }
  }

  private async getOrCreateWallet(
    ownerType: OwnerType,
    ownerId: string,
    currency: Currency,
    tx: Prisma.TransactionClient = this.prisma
  ) {
    return tx.wallet.upsert({
      where: { ownerType_ownerId_currency: { ownerType, ownerId, currency } },
      update: {},
      create: { ownerType, ownerId, currency }
    });
  }

  private async releasePendingTransactions(walletId: string, tx: Prisma.TransactionClient) {
    const now = new Date();
    const pending = await tx.walletTransaction.findMany({
      where: {
        walletId,
        type: WalletTransactionType.CREDIT,
        appliedToBalance: false,
        availableAt: { lte: now }
      },
      select: { id: true, amountCents: true }
    });
    if (!pending.length) {
      return;
    }
    const total = pending.reduce((sum, item) => sum + item.amountCents, 0);
    await tx.wallet.update({
      where: { id: walletId },
      data: {
        balanceCents: { increment: total },
        pendingCents: { decrement: total }
      }
    });
    await tx.walletTransaction.updateMany({
      where: { id: { in: pending.map((item) => item.id) } },
      data: { appliedToBalance: true }
    });
  }

  private async buildWalletResponse(walletId: string, tx: Prisma.TransactionClient) {
    const wallet = await tx.wallet.findUnique({ where: { id: walletId } });
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }
    const [{ _sum }, latestKyc, payoutAccounts] = await Promise.all([
      tx.payoutRequest.aggregate({
        where: { walletId, status: { in: ACTIVE_PAYOUT_STATUSES } },
        _sum: { amountCents: true }
      }),
      tx.kycRecord.findFirst({
        where: { ownerId: wallet.ownerId, ownerType: wallet.ownerType },
        orderBy: { updatedAt: 'desc' }
      }),
      tx.payoutAccount.findMany({
        where: { ownerId: wallet.ownerId, ownerType: wallet.ownerType },
        orderBy: { createdAt: 'desc' }
      })
    ]);
    const reservedCents = _sum.amountCents ?? 0;
    return {
      ...wallet,
      reservedCents,
      availableCents: Math.max(wallet.balanceCents - reservedCents, 0),
      latestKyc,
      payoutAccounts
    };
  }

  private async applyPayoutDebit(payout: { id: string; walletId: string; amountCents: number }, tx: Prisma.TransactionClient) {
    const existing = await tx.walletTransaction.findFirst({
      where: { walletId: payout.walletId, source: WalletTransactionSource.PAYOUT, sourceId: payout.id }
    });
    if (existing) {
      return;
    }

    await tx.walletTransaction.create({
      data: {
        walletId: payout.walletId,
        amountCents: payout.amountCents,
        type: WalletTransactionType.DEBIT,
        source: WalletTransactionSource.PAYOUT,
        sourceId: payout.id,
        description: 'Payout settled',
        availableAt: new Date(),
        appliedToBalance: true
      }
    });

    await tx.wallet.update({
      where: { id: payout.walletId },
      data: {
        balanceCents: { decrement: payout.amountCents }
      }
    });
  }
}
