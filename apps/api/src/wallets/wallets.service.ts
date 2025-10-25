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
  PayoutMethod,
  PayoutStatus,
  Prisma,
  Role,
  Wallet,
  WalletTransactionSource,
  WalletTransactionType
} from '@prisma/client';
import { addDays, startOfDay } from 'date-fns';
import { Buffer } from 'node:buffer';
import PDFDocument from 'pdfkit';
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
import { ListKycRecordsDto } from './dto/list-kyc-records.dto';
import { ListPayoutRequestsDto } from './dto/list-payout-requests.dto';
import { ListPayoutAccountsDto } from './dto/list-payout-accounts.dto';
import { ManageAmlBlocklistDto } from './dto/manage-aml-blocklist.dto';
import {
  UpsertWalletThresholdDto,
  walletThresholdTypes
} from './dto/upsert-wallet-threshold.dto';
import { MailService } from '../mail/mail.service';

type FeatureFlagRecord = {
  key: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  enabled: boolean;
};

type WalletThresholdEntry = {
  id: string | null;
  type: string;
  currency: Currency;
  amountCents: number;
  note: string | null;
  source: 'custom' | 'env';
  createdAt: Date | null;
  updatedAt: Date | null;
};

type PrismaClientOrTx = Prisma.TransactionClient | PrismaService;

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

const APPROVABLE_PAYOUT_STATUSES: PayoutStatus[] = [
  PayoutStatus.REQUESTED,
  PayoutStatus.REVIEW
];

const AML_BLOCKLIST_PREFIX = 'wallet.aml.blocklist.';
const WALLET_THRESHOLD_PREFIX = 'wallet.threshold.';

@Injectable()
export class WalletsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly mail: MailService
  ) {}

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

  listPayoutAccounts(filters: ListPayoutAccountsDto) {
    return this.prisma.payoutAccount.findMany({
      where: {
        ownerId: filters.ownerId ?? undefined,
        ownerType: filters.ownerType ?? undefined,
        verifiedAt:
          filters.verified === undefined
            ? undefined
            : filters.verified
              ? { not: null }
              : null
      },
      orderBy: { createdAt: 'desc' },
      take: 200
    });
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

  listKycRecords(filters: ListKycRecordsDto) {
    return this.prisma.kycRecord.findMany({
      where: {
        status: filters.status ?? undefined,
        ownerId: filters.ownerId ?? undefined
      },
      orderBy: { createdAt: 'desc' },
      take: 200
    });
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

      const minPayoutCents =
        (await this.resolveThreshold('MIN_PAYOUT', wallet.currency, tx)) ??
        env.WALLET_MIN_PAYOUT_CENTS;

      if (dto.amountCents < minPayoutCents) {
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
      if (!APPROVABLE_PAYOUT_STATUSES.includes(payout.status)) {
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

  listPayoutRequests(filters: ListPayoutRequestsDto) {
    return this.prisma.payoutRequest.findMany({
      where: {
        status: filters.status ?? undefined,
        walletId: filters.walletId ?? undefined
      },
      include: {
        wallet: true,
        payoutAccount: true
      },
      orderBy: { createdAt: 'desc' },
      take: 200
    });
  }

  async handleWebhook(dto: PayoutWebhookDto) {
    let receiptContext: {
      payoutId: string;
      ownerType: OwnerType;
      ownerId: string;
      amountCents: number;
      currency: Currency;
      method: PayoutMethod;
      txRef?: string | null;
      paidAt: Date;
    } | null = null;

    const result = await this.prisma.$transaction(async (tx) => {
      const payout = await tx.payoutRequest.findFirst({ where: { txRef: dto.txRef }, include: { wallet: true } });
      if (!payout) {
        throw new NotFoundException('Payout not found for webhook');
      }

      if (payout.status === dto.status) {
        return payout;
      }

      const updated = await tx.payoutRequest.update({
        where: { id: payout.id },
        data: { status: dto.status },
        include: { wallet: true }
      });

      if (dto.status === PayoutStatus.PAID) {
        await this.applyPayoutDebit(updated, tx);
        receiptContext = {
          payoutId: updated.id,
          ownerType: updated.wallet.ownerType,
          ownerId: updated.wallet.ownerId,
          amountCents: updated.amountCents,
          currency: updated.wallet.currency,
          method: updated.method,
          txRef: updated.txRef ?? dto.txRef,
          paidAt: updated.updatedAt
        };
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

    if (receiptContext) {
      await this.issuePayoutReceipt(receiptContext);
    }

    return result;
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

  async listAmlBlocklist() {
    const flags = await this.prisma.featureFlag.findMany({
      where: { key: { startsWith: AML_BLOCKLIST_PREFIX } },
      orderBy: { createdAt: 'desc' }
    });

    return (flags as FeatureFlagRecord[]).map((flag) => this.mapAmlBlocklistFlag(flag));
  }

  async addAmlBlocklistEntry(dto: ManageAmlBlocklistDto, actor: AuthContext) {
    const normalized = this.normalizeBlocklistValue(dto.value);
    const key = `${AML_BLOCKLIST_PREFIX}${normalized}`;
    const payload = {
      value: dto.value,
      normalized,
      reason: dto.reason ?? null,
      addedBy: actor.userId
    };

    const flag = await this.prisma.featureFlag.upsert({
      where: { key },
      update: { description: JSON.stringify(payload), enabled: true },
      create: { key, description: JSON.stringify(payload), enabled: true }
    });

    await this.audit.log({
      action: 'wallet.aml.add',
      actorId: actor.userId,
      targetType: 'amlBlocklist',
      targetId: key,
      metadata: payload
    });

    return this.mapAmlBlocklistFlag(flag);
  }

  async removeAmlBlocklistEntry(id: string, actor: AuthContext) {
    const key = `${AML_BLOCKLIST_PREFIX}${id}`;
    const flag = await this.prisma.featureFlag.findUnique({ where: { key } });
    if (!flag) {
      throw new NotFoundException('Blocklist entry not found');
    }

    await this.prisma.featureFlag.delete({ where: { key } });

    await this.audit.log({
      action: 'wallet.aml.remove',
      actorId: actor.userId,
      targetType: 'amlBlocklist',
      targetId: key
    });

    return { success: true };
  }

  async listWalletThresholds() {
    const flags = await this.prisma.featureFlag.findMany({
      where: { key: { startsWith: WALLET_THRESHOLD_PREFIX } },
      orderBy: { key: 'asc' }
    });

    const entries: WalletThresholdEntry[] = (flags as FeatureFlagRecord[]).map((flag) =>
      this.mapWalletThreshold(flag)
    );
    const hasMin = entries.some((entry) => entry.type === 'MIN_PAYOUT');
    if (!hasMin) {
      entries.push({
        id: null,
        type: 'MIN_PAYOUT',
        currency: DEFAULT_CURRENCY,
        amountCents: env.WALLET_MIN_PAYOUT_CENTS,
        note: 'Configured via environment',
        source: 'env',
        updatedAt: null,
        createdAt: null
      });
    }

    return entries;
  }

  async upsertWalletThreshold(dto: UpsertWalletThresholdDto, actor: AuthContext) {
    if (!walletThresholdTypes.includes(dto.type)) {
      throw new BadRequestException('Unsupported threshold type');
    }

    const key = `${WALLET_THRESHOLD_PREFIX}${dto.type}.${dto.currency}`;
    const payload = {
      amountCents: dto.amountCents,
      note: dto.note ?? null,
      updatedBy: actor.userId
    };

    const flag = await this.prisma.featureFlag.upsert({
      where: { key },
      update: { description: JSON.stringify(payload), enabled: true },
      create: { key, description: JSON.stringify(payload), enabled: true }
    });

    await this.audit.log({
      action: 'wallet.threshold.upsert',
      actorId: actor.userId,
      targetType: 'walletThreshold',
      targetId: key,
      metadata: payload
    });

    return this.mapWalletThreshold(flag);
  }

  private resolveOwner(actor: AuthContext): { ownerType: OwnerType; ownerId: string } {
    if (actor.role === Role.ADMIN) {
      throw new ForbiddenException('Administrators do not have personal wallets');
    }
    return { ownerType: OwnerType.USER, ownerId: actor.userId };
  }

  private normalizeBlocklistValue(value: string) {
    return value.replace(/[\s+\-]/g, '').toLowerCase();
  }

  private mapAmlBlocklistFlag(flag: {
    key: string;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
    enabled: boolean;
  }) {
    const id = flag.key.replace(AML_BLOCKLIST_PREFIX, '');
    let payload: {
      value?: string;
      normalized?: string;
      reason?: string | null;
      addedBy?: string | null;
    } = {};

    if (flag.description) {
      try {
        payload = JSON.parse(flag.description);
      } catch (error) {
        payload = { value: id, reason: flag.description };
      }
    }

    const value = payload.value ?? id;

    return {
      id,
      value,
      normalized: payload.normalized ?? this.normalizeBlocklistValue(value),
      reason: payload.reason ?? null,
      addedBy: payload.addedBy ?? null,
      createdAt: flag.createdAt,
      updatedAt: flag.updatedAt,
      enabled: flag.enabled
    };
  }

  private mapWalletThreshold(flag: FeatureFlagRecord): WalletThresholdEntry {
    const suffix = flag.key.replace(WALLET_THRESHOLD_PREFIX, '');
    const [type, currency] = suffix.split('.');
    let amountCents: number | null = null;
    let note: string | null = null;

    if (flag.description) {
      try {
        const parsed = JSON.parse(flag.description);
        if (typeof parsed.amountCents === 'number') {
          amountCents = parsed.amountCents;
        } else {
          const numeric = Number(parsed.amountCents ?? parsed);
          if (!Number.isNaN(numeric)) {
            amountCents = numeric;
          }
        }
        if (typeof parsed.note === 'string') {
          note = parsed.note;
        }
      } catch (error) {
        const numeric = Number(flag.description);
        if (!Number.isNaN(numeric)) {
          amountCents = numeric;
        } else {
          note = flag.description;
        }
      }
    }

    const fallback = type === 'MIN_PAYOUT' ? env.WALLET_MIN_PAYOUT_CENTS : 0;

    return {
      id: flag.key,
      type,
      currency: (currency as Currency) ?? DEFAULT_CURRENCY,
      amountCents: amountCents ?? fallback,
      note,
      source: 'custom',
      createdAt: flag.createdAt,
      updatedAt: flag.updatedAt
    };
  }

  private async resolveThreshold(
    type: (typeof walletThresholdTypes)[number],
    currency: Currency,
    tx: PrismaClientOrTx = this.prisma
  ) {
    const key = `${WALLET_THRESHOLD_PREFIX}${type}.${currency}`;
    const flag = await tx.featureFlag.findUnique({ where: { key } });
    if (!flag) {
      return null;
    }
    const entry = this.mapWalletThreshold(flag);
    return entry.amountCents;
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
    tx: PrismaClientOrTx = this.prisma
  ) {
    return tx.wallet.upsert({
      where: { ownerType_ownerId_currency: { ownerType, ownerId, currency } },
      update: {},
      create: { ownerType, ownerId, currency }
    });
  }

  private async releasePendingTransactions(walletId: string, tx: PrismaClientOrTx) {
    const now = new Date();
    const pending = (await tx.walletTransaction.findMany({
      where: {
        walletId,
        type: WalletTransactionType.CREDIT,
        appliedToBalance: false,
        availableAt: { lte: now }
      },
      select: { id: true, amountCents: true }
    })) as Array<{ id: string; amountCents: number }>;
    if (!pending.length) {
      return;
    }
    const total = pending.reduce<number>((sum, item) => sum + item.amountCents, 0);
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

  private async buildWalletResponse(walletId: string, tx: PrismaClientOrTx) {
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

  private async applyPayoutDebit(
    payout: { id: string; walletId: string; amountCents: number },
    tx: PrismaClientOrTx
  ) {
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

  private async issuePayoutReceipt(context: {
    payoutId: string;
    ownerType: OwnerType;
    ownerId: string;
    amountCents: number;
    currency: Currency;
    method: PayoutMethod;
    txRef?: string | null;
    paidAt: Date;
  }) {
    const owner = await this.resolveOwnerContact(context.ownerType, context.ownerId);
    const ownerName = owner.name ?? 'Account holder';
    const pdfUrl = await this.generatePayoutReceiptPdf(context, ownerName);

    await this.prisma.payoutRequest.update({
      where: { id: context.payoutId },
      data: { receiptPdfUrl: pdfUrl }
    });

    if (!owner.email) {
      return;
    }

    const amount = (context.amountCents / 100).toFixed(2);
    const reference = context.txRef ?? context.payoutId;

    await this.mail.send({
      to: owner.email,
      subject: `Payout receipt ${reference}`,
      text: `Hi ${ownerName},\n\nWe have sent ${amount} ${context.currency} via ${context.method}. Your payout receipt is attached for your records.\n\n-- Propad`,
      filename: `payout-${reference}.pdf`,
      pdfDataUrl: pdfUrl
    });
  }

  private async generatePayoutReceiptPdf(
    context: {
      payoutId: string;
      amountCents: number;
      currency: Currency;
      method: PayoutMethod;
      txRef?: string | null;
      paidAt: Date;
    },
    ownerName: string
  ) {
    return new Promise<string>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const buffers: Buffer[] = [];

      doc.on('data', (chunk: unknown) => {
        if (chunk instanceof Buffer) {
          buffers.push(chunk);
        }
      });
      doc.on('error', (err: unknown) => {
        reject(err instanceof Error ? err : new Error(String(err)));
      });
      doc.on('end', () => {
        const buffer = Buffer.concat(buffers) as Buffer;
        resolve(`data:application/pdf;base64,${buffer.toString('base64')}`);
      });

      doc.fontSize(20).text('Propad Payout Receipt', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Recipient: ${ownerName}`);
      doc.text(`Reference: ${context.txRef ?? context.payoutId}`);
      doc.text(`Method: ${context.method}`);
      doc.text(`Paid At: ${context.paidAt.toISOString()}`);
      doc.text(`Amount: ${(context.amountCents / 100).toFixed(2)} ${context.currency}`);
      doc.end();
    });
  }

  private async resolveOwnerContact(ownerType: OwnerType, ownerId: string) {
    if (ownerType === OwnerType.USER) {
      const user = await this.prisma.user.findUnique({ where: { id: ownerId }, select: { email: true, name: true } });
      return { email: user?.email ?? null, name: user?.name ?? null };
    }
    if (ownerType === OwnerType.AGENCY) {
      const agency = await this.prisma.agency.findUnique({ where: { id: ownerId }, select: { email: true, name: true } });
      return { email: agency?.email ?? null, name: agency?.name ?? null };
    }
    return { email: null, name: null };
  }
}
