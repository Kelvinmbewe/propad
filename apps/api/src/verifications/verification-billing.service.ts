import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import {
  BillingInvoiceKind,
  BillingInvoiceStatus,
  PaymentReceiptMethod,
  Prisma,
  VerificationItemType,
  VerificationItemWorkflowStatus,
  VerificationPricingKey,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

type Tx = Prisma.TransactionClient;

type InvoiceLinePlan = {
  pricingKey: VerificationPricingKey;
  amountCents: number;
  quantity: number;
};

@Injectable()
export class VerificationBillingService {
  private readonly logger = new Logger(VerificationBillingService.name);
  private pricingCache: {
    expiresAt: number;
    values: Map<
      VerificationPricingKey,
      { amountCents: number; currency: string }
    >;
  } | null = null;

  constructor(private readonly prisma: PrismaService) {}

  private getClient(tx?: Tx) {
    return tx ?? this.prisma;
  }

  private async getPricingMap(
    tx?: Tx,
    force = false,
  ): Promise<
    Map<VerificationPricingKey, { amountCents: number; currency: string }>
  > {
    const now = Date.now();
    if (!force && this.pricingCache && this.pricingCache.expiresAt > now) {
      return this.pricingCache.values;
    }

    const rows = await this.getClient(tx).verificationPricing.findMany({
      where: { isActive: true },
      select: { key: true, amountCents: true, currency: true },
    });

    const values = new Map<
      VerificationPricingKey,
      { amountCents: number; currency: string }
    >();
    for (const row of rows) {
      values.set(row.key, {
        amountCents: row.amountCents,
        currency: row.currency,
      });
    }

    this.pricingCache = {
      values,
      expiresAt: now + 60_000,
    };

    return values;
  }

  async listPricing() {
    return this.prisma.verificationPricing.findMany({
      orderBy: [{ isActive: "desc" }, { key: "asc" }],
    });
  }

  async upsertPricing(
    payload: {
      key: VerificationPricingKey;
      amountCents: number;
      currency?: string;
      isActive?: boolean;
      description?: string;
    },
    actorUserId: string,
  ) {
    if (payload.amountCents < 0) {
      throw new BadRequestException("amountCents must be 0 or greater");
    }

    const row = await this.prisma.verificationPricing.upsert({
      where: { key: payload.key },
      update: {
        amountCents: payload.amountCents,
        currency: payload.currency ?? "USD",
        isActive: payload.isActive ?? true,
        description: payload.description ?? null,
        updatedByUserId: actorUserId,
      },
      create: {
        key: payload.key,
        amountCents: payload.amountCents,
        currency: payload.currency ?? "USD",
        isActive: payload.isActive ?? true,
        description: payload.description ?? null,
        updatedByUserId: actorUserId,
      },
    });

    await this.getPricingMap(undefined, true);
    return row;
  }

  private basePricingKeyByItemType(
    itemType: VerificationItemType,
  ): VerificationPricingKey {
    if (itemType === VerificationItemType.LOCATION_CONFIRMATION) {
      return VerificationPricingKey.LOCATION_CONFIRMATION_BASE;
    }
    if (itemType === VerificationItemType.PROOF_OF_OWNERSHIP) {
      return VerificationPricingKey.PROOF_OF_OWNERSHIP;
    }
    if (itemType === VerificationItemType.PROPERTY_PHOTOS) {
      return VerificationPricingKey.PROPERTY_PHOTOS;
    }
    return VerificationPricingKey.PROPERTY_VERIFICATION;
  }

  private async buildExpectedLines(
    item: {
      type: VerificationItemType;
      siteVisitRequested: boolean;
      verificationRequest: { requesterId: string; propertyId: string | null };
    },
    options: {
      hasPaidBaseLocationInvoice: boolean;
      paidHasAddon: boolean;
    },
    tx?: Tx,
  ) {
    const pricingMap = await this.getPricingMap(tx);
    const baseKey = this.basePricingKeyByItemType(item.type);

    const makeLine = (key: VerificationPricingKey): InvoiceLinePlan => {
      const price = pricingMap.get(key);
      if (!price) {
        throw new BadRequestException(
          `Missing active pricing for ${key}. Configure verification pricing first.`,
        );
      }
      return {
        pricingKey: key,
        amountCents: price.amountCents,
        quantity: 1,
      };
    };

    const lines: InvoiceLinePlan[] = [];
    if (
      item.type === VerificationItemType.LOCATION_CONFIRMATION &&
      options.hasPaidBaseLocationInvoice
    ) {
      if (item.siteVisitRequested && !options.paidHasAddon) {
        lines.push(
          makeLine(
            VerificationPricingKey.LOCATION_CONFIRMATION_SITE_VISIT_ADDON,
          ),
        );
      }
      return lines;
    }

    lines.push(makeLine(baseKey));
    if (
      item.type === VerificationItemType.LOCATION_CONFIRMATION &&
      item.siteVisitRequested
    ) {
      lines.push(
        makeLine(VerificationPricingKey.LOCATION_CONFIRMATION_SITE_VISIT_ADDON),
      );
    }
    return lines;
  }

  private totalForLines(lines: InvoiceLinePlan[]) {
    return lines.reduce(
      (sum, line) => sum + line.amountCents * (line.quantity || 1),
      0,
    );
  }

  async createOrUpdateVerificationPriorityInvoice(input: {
    userId?: string;
    listingId?: string | null;
    verificationItemId: string;
    tx?: Tx;
  }) {
    const client = this.getClient(input.tx);

    const item = await client.verificationRequestItem.findUnique({
      where: { id: input.verificationItemId },
      include: {
        verificationRequest: {
          select: { requesterId: true, propertyId: true },
        },
      },
    });

    if (!item) {
      throw new NotFoundException("Verification item not found");
    }

    const userId = input.userId ?? item.verificationRequest.requesterId;
    const listingId = input.listingId ?? item.verificationRequest.propertyId;

    const itemStatus = String(item.status).toUpperCase();
    const workflowStatus = item.workflowStatus;
    const terminal =
      workflowStatus === VerificationItemWorkflowStatus.APPROVED ||
      workflowStatus === VerificationItemWorkflowStatus.REJECTED ||
      itemStatus === "APPROVED" ||
      itemStatus === "REJECTED";

    if (terminal) {
      await this.cancelVerificationInvoicesOnDecision(
        item.id,
        itemStatus === "APPROVED" ? "APPROVED" : "REJECTED",
        item.decidedByUserId ?? null,
        input.tx,
      );
      return null;
    }

    const existing = await client.billingInvoice.findMany({
      where: {
        verificationItemId: item.id,
        kind: BillingInvoiceKind.VERIFICATION_PRIORITY,
      },
      include: { lines: true },
      orderBy: { createdAt: "asc" },
    });

    const paidInvoices = existing.filter(
      (invoice) => invoice.status === BillingInvoiceStatus.PAID,
    );
    const hasPaidBaseLocationInvoice = paidInvoices.some((invoice) =>
      invoice.lines.some(
        (line) =>
          line.pricingKey === VerificationPricingKey.LOCATION_CONFIRMATION_BASE,
      ),
    );
    const paidHasAddon = paidInvoices.some((invoice) =>
      invoice.lines.some(
        (line) =>
          line.pricingKey ===
          VerificationPricingKey.LOCATION_CONFIRMATION_SITE_VISIT_ADDON,
      ),
    );

    const expectedLines = await this.buildExpectedLines(
      {
        type: item.type,
        siteVisitRequested: item.siteVisitRequested,
        verificationRequest: item.verificationRequest,
      },
      { hasPaidBaseLocationInvoice, paidHasAddon },
      input.tx,
    );

    if (expectedLines.length === 0) {
      return null;
    }

    const expectedTotal = this.totalForLines(expectedLines);
    const openStatuses: BillingInvoiceStatus[] = [
      BillingInvoiceStatus.PENDING,
      BillingInvoiceStatus.ISSUED,
      BillingInvoiceStatus.DRAFT,
    ];

    const openInvoice = existing
      .filter((invoice) => openStatuses.includes(invoice.status))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];

    const pricingMap = await this.getPricingMap(input.tx);
    const defaultCurrency =
      pricingMap.get(expectedLines[0].pricingKey)?.currency ?? "USD";

    const baseDescription =
      item.type === VerificationItemType.LOCATION_CONFIRMATION
        ? item.siteVisitRequested
          ? "Verification priority - Location confirmation (base + site visit add-on)"
          : "Verification priority - Location confirmation"
        : `Verification priority - ${item.type.replace(/_/g, " ")}`;

    if (openInvoice) {
      const currentSig = openInvoice.lines
        .map(
          (line) => `${line.pricingKey}:${line.amountCents}:${line.quantity}`,
        )
        .sort()
        .join("|");
      const expectedSig = expectedLines
        .map(
          (line) => `${line.pricingKey}:${line.amountCents}:${line.quantity}`,
        )
        .sort()
        .join("|");

      if (
        openInvoice.amountCents !== expectedTotal ||
        currentSig !== expectedSig ||
        openInvoice.currency !== defaultCurrency
      ) {
        await client.billingInvoiceLine.deleteMany({
          where: { invoiceId: openInvoice.id },
        });
        await client.billingInvoice.update({
          where: { id: openInvoice.id },
          data: {
            amountCents: expectedTotal,
            currency: defaultCurrency,
            description: baseDescription,
            lines: {
              create: expectedLines.map((line) => ({
                pricingKey: line.pricingKey,
                amountCents: line.amountCents,
                quantity: line.quantity,
              })),
            },
          },
        });
      }

      return client.billingInvoice.findUnique({
        where: { id: openInvoice.id },
        include: { lines: true, verificationItem: true },
      });
    }

    return client.billingInvoice.create({
      data: {
        userId,
        listingId,
        verificationItemId: item.id,
        kind: BillingInvoiceKind.VERIFICATION_PRIORITY,
        status: BillingInvoiceStatus.PENDING,
        amountCents: expectedTotal,
        currency: defaultCurrency,
        description: baseDescription,
        lines: {
          create: expectedLines.map((line) => ({
            pricingKey: line.pricingKey,
            amountCents: line.amountCents,
            quantity: line.quantity,
          })),
        },
      },
      include: { lines: true, verificationItem: true },
    });
  }

  async cancelVerificationInvoicesOnDecision(
    verificationItemId: string,
    decidedStatus: "APPROVED" | "REJECTED",
    _decidedByUserId?: string | null,
    tx?: Tx,
  ) {
    const client = this.getClient(tx);
    const now = new Date();
    const result = await client.billingInvoice.updateMany({
      where: {
        verificationItemId,
        kind: BillingInvoiceKind.VERIFICATION_PRIORITY,
        status: {
          in: [
            BillingInvoiceStatus.PENDING,
            BillingInvoiceStatus.ISSUED,
            BillingInvoiceStatus.DRAFT,
          ],
        },
      },
      data: {
        status: BillingInvoiceStatus.CANCELLED,
        cancelledAt: now,
        cancelledReason: `Auto-cancelled: verification ${decidedStatus} before payment`,
      },
    });

    if (result.count > 0) {
      this.logger.log(
        `Cancelled ${result.count} verification invoice(s) for item ${verificationItemId}`,
      );
    }

    return result.count;
  }

  async reconcileVerificationInvoicesForListing(listingId: string, tx?: Tx) {
    const client = this.getClient(tx);
    const invoices = await client.billingInvoice.findMany({
      where: {
        listingId,
        kind: BillingInvoiceKind.VERIFICATION_PRIORITY,
        status: {
          in: [BillingInvoiceStatus.PENDING, BillingInvoiceStatus.ISSUED],
        },
        verificationItemId: { not: null },
      },
      select: {
        id: true,
        verificationItemId: true,
        verificationItem: { select: { status: true, workflowStatus: true } },
      },
    });

    let cancelled = 0;
    for (const invoice of invoices) {
      const itemStatus = String(
        invoice.verificationItem?.status ?? "",
      ).toUpperCase();
      const workflowStatus = invoice.verificationItem?.workflowStatus;
      if (
        workflowStatus === VerificationItemWorkflowStatus.APPROVED ||
        workflowStatus === VerificationItemWorkflowStatus.REJECTED ||
        itemStatus === "APPROVED" ||
        itemStatus === "REJECTED"
      ) {
        cancelled += await this.cancelVerificationInvoicesOnDecision(
          String(invoice.verificationItemId),
          itemStatus === "APPROVED" ? "APPROVED" : "REJECTED",
          null,
          tx,
        );
      }
    }

    return cancelled;
  }

  async markVerificationInvoicePaid(input: {
    verificationItemId: string;
    amountCents: number;
    currency: string;
    method?: PaymentReceiptMethod;
    reference?: string | null;
    proofFileUrl?: string | null;
    paidAt?: Date;
    createdByUserId?: string | null;
    tx?: Tx;
  }) {
    const client = this.getClient(input.tx);

    const invoice = await client.billingInvoice.findFirst({
      where: {
        verificationItemId: input.verificationItemId,
        kind: BillingInvoiceKind.VERIFICATION_PRIORITY,
        status: {
          in: [
            BillingInvoiceStatus.PENDING,
            BillingInvoiceStatus.ISSUED,
            BillingInvoiceStatus.DRAFT,
          ],
        },
      },
      orderBy: { createdAt: "asc" },
    });

    if (!invoice) {
      return null;
    }

    return this.markVerificationInvoicePaidById({
      billingInvoiceId: invoice.id,
      amountCents: input.amountCents,
      currency: input.currency,
      method: input.method,
      reference: input.reference,
      proofFileUrl: input.proofFileUrl,
      paidAt: input.paidAt,
      createdByUserId: input.createdByUserId,
      tx: input.tx,
    });
  }

  async markVerificationInvoicePaidById(input: {
    billingInvoiceId: string;
    amountCents: number;
    currency: string;
    method?: PaymentReceiptMethod;
    reference?: string | null;
    proofFileUrl?: string | null;
    paidAt?: Date;
    createdByUserId?: string | null;
    tx?: Tx;
  }) {
    const client = this.getClient(input.tx);
    const invoice = await client.billingInvoice.findUnique({
      where: { id: input.billingInvoiceId },
      select: {
        id: true,
        kind: true,
        status: true,
        externalRef: true,
      },
    });

    if (!invoice || invoice.kind !== BillingInvoiceKind.VERIFICATION_PRIORITY) {
      return null;
    }

    const payableStatuses: BillingInvoiceStatus[] = [
      BillingInvoiceStatus.PENDING,
      BillingInvoiceStatus.ISSUED,
      BillingInvoiceStatus.DRAFT,
    ];

    if (!payableStatuses.includes(invoice.status)) {
      return null;
    }

    const paidAt = input.paidAt ?? new Date();
    await client.billingInvoice.update({
      where: { id: invoice.id },
      data: {
        status: BillingInvoiceStatus.PAID,
        externalRef: input.reference ?? invoice.externalRef,
      },
    });

    await client.paymentReceipt.create({
      data: {
        invoiceId: invoice.id,
        method: input.method ?? PaymentReceiptMethod.OTHER,
        reference: input.reference ?? null,
        proofFileUrl: input.proofFileUrl ?? null,
        paidAt,
        amountCents: input.amountCents,
        currency: input.currency,
        createdByUserId: input.createdByUserId ?? null,
      },
    });

    return invoice.id;
  }

  async listVerificationInvoicesForListing(listingId: string) {
    await this.reconcileVerificationInvoicesForListing(listingId);
    return this.prisma.billingInvoice.findMany({
      where: {
        listingId,
        kind: BillingInvoiceKind.VERIFICATION_PRIORITY,
      },
      include: {
        lines: true,
        verificationItem: {
          select: {
            id: true,
            type: true,
            status: true,
            workflowStatus: true,
            siteVisitRequested: true,
          },
        },
        receipts: {
          orderBy: { paidAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }
}
