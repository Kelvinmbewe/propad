import { describe, expect, it } from "vitest";
import {
  BillingInvoiceKind,
  BillingInvoiceStatus,
  VerificationItemType,
  VerificationItemWorkflowStatus,
  VerificationPricingKey,
} from "@prisma/client";
import { VerificationBillingService } from "./verification-billing.service";

type ItemState = {
  id: string;
  type: VerificationItemType;
  status: string;
  workflowStatus: VerificationItemWorkflowStatus;
  siteVisitRequested: boolean;
  decidedByUserId: string | null;
  verificationRequest: { requesterId: string; propertyId: string | null };
};

type InvoiceState = {
  id: string;
  userId: string;
  listingId: string | null;
  verificationItemId: string | null;
  kind: BillingInvoiceKind;
  status: BillingInvoiceStatus;
  amountCents: number;
  currency: string;
  description: string;
  externalRef: string | null;
  createdAt: Date;
  updatedAt: Date;
  cancelledAt: Date | null;
  cancelledReason: string | null;
  writtenOffAt: Date | null;
  writtenOffReason: string | null;
  lines: Array<{
    id: string;
    pricingKey: VerificationPricingKey;
    amountCents: number;
    quantity: number;
  }>;
};

function createHarness(seed: {
  item: ItemState;
  invoices?: InvoiceState[];
  prices?: Partial<Record<VerificationPricingKey, number>>;
}) {
  const item = seed.item;
  const invoices: InvoiceState[] = seed.invoices ? [...seed.invoices] : [];
  const receipts: any[] = [];
  const prices: Record<VerificationPricingKey, number> = {
    [VerificationPricingKey.LOCATION_CONFIRMATION_BASE]: 500,
    [VerificationPricingKey.LOCATION_CONFIRMATION_SITE_VISIT_ADDON]: 1500,
    [VerificationPricingKey.PROPERTY_PHOTOS]: 500,
    [VerificationPricingKey.PROOF_OF_OWNERSHIP]: 500,
    [VerificationPricingKey.PROPERTY_VERIFICATION]: 500,
    ...(seed.prices ?? {}),
  };

  const prisma = {
    verificationPricing: {
      findMany: async () =>
        Object.entries(prices).map(([key, amountCents]) => ({
          key: key as VerificationPricingKey,
          amountCents,
          currency: "USD",
          isActive: true,
        })),
      upsert: async ({ where, update, create }: any) => ({
        key: where.key,
        ...(update ?? create),
      }),
    },
    verificationRequestItem: {
      findUnique: async ({ where }: any) => {
        if (where.id !== item.id) return null;
        return item;
      },
    },
    billingInvoice: {
      findMany: async ({ where }: any) =>
        invoices
          .filter((invoice) => {
            if (
              where?.verificationItemId &&
              invoice.verificationItemId !== where.verificationItemId
            ) {
              return false;
            }
            if (where?.kind && invoice.kind !== where.kind) {
              return false;
            }
            if (where?.listingId && invoice.listingId !== where.listingId) {
              return false;
            }
            if (
              where?.status?.in &&
              !where.status.in.includes(invoice.status)
            ) {
              return false;
            }
            return true;
          })
          .map((invoice) => ({ ...invoice })),
      findUnique: async ({ where }: any) =>
        invoices.find((invoice) => invoice.id === where.id) ?? null,
      findFirst: async ({ where }: any) =>
        invoices.find((invoice) => {
          if (
            where?.verificationItemId &&
            invoice.verificationItemId !== where.verificationItemId
          ) {
            return false;
          }
          if (where?.kind && invoice.kind !== where.kind) {
            return false;
          }
          if (where?.status?.in && !where.status.in.includes(invoice.status)) {
            return false;
          }
          return true;
        }) ?? null,
      create: async ({ data }: any) => {
        const created: InvoiceState = {
          id: `inv_${invoices.length + 1}`,
          userId: data.userId,
          listingId: data.listingId ?? null,
          verificationItemId: data.verificationItemId ?? null,
          kind: data.kind,
          status: data.status,
          amountCents: data.amountCents,
          currency: data.currency,
          description: data.description,
          externalRef: data.externalRef ?? null,
          createdAt: new Date(),
          updatedAt: new Date(),
          cancelledAt: null,
          cancelledReason: null,
          writtenOffAt: null,
          writtenOffReason: null,
          lines: (data.lines?.create ?? []).map((line: any, index: number) => ({
            id: `line_${invoices.length + 1}_${index + 1}`,
            pricingKey: line.pricingKey,
            amountCents: line.amountCents,
            quantity: line.quantity,
          })),
        };
        invoices.push(created);
        return created;
      },
      update: async ({ where, data }: any) => {
        const invoice = invoices.find((entry) => entry.id === where.id);
        if (!invoice) throw new Error("invoice not found");
        Object.assign(invoice, data);
        invoice.updatedAt = new Date();
        if (data.lines?.create) {
          invoice.lines = data.lines.create.map((line: any, index: number) => ({
            id: `line_${invoice.id}_${index + 1}`,
            pricingKey: line.pricingKey,
            amountCents: line.amountCents,
            quantity: line.quantity,
          }));
        }
        return invoice;
      },
      updateMany: async ({ where, data }: any) => {
        let count = 0;
        for (const invoice of invoices) {
          if (
            where?.verificationItemId &&
            invoice.verificationItemId !== where.verificationItemId
          ) {
            continue;
          }
          if (where?.kind && invoice.kind !== where.kind) {
            continue;
          }
          if (where?.status?.in && !where.status.in.includes(invoice.status)) {
            continue;
          }
          Object.assign(invoice, data);
          invoice.updatedAt = new Date();
          count += 1;
        }
        return { count };
      },
    },
    billingInvoiceLine: {
      deleteMany: async ({ where }: any) => {
        const invoice = invoices.find((entry) => entry.id === where.invoiceId);
        if (invoice) {
          invoice.lines = [];
        }
        return { count: invoice ? 1 : 0 };
      },
    },
    paymentReceipt: {
      create: async ({ data }: any) => {
        receipts.push(data);
        return data;
      },
    },
  };

  const service = new VerificationBillingService(prisma as any);
  return { service, item, invoices, receipts, prices };
}

describe("VerificationBillingService", () => {
  it("creates base-only invoice for location without site visit", async () => {
    const { service, invoices } = createHarness({
      item: {
        id: "item_1",
        type: VerificationItemType.LOCATION_CONFIRMATION,
        status: "SUBMITTED",
        workflowStatus: VerificationItemWorkflowStatus.SUBMITTED,
        siteVisitRequested: false,
        decidedByUserId: null,
        verificationRequest: { requesterId: "user_1", propertyId: "listing_1" },
      },
    });

    const invoice = await service.createOrUpdateVerificationPriorityInvoice({
      verificationItemId: "item_1",
    });

    expect(invoice?.status).toBe(BillingInvoiceStatus.PENDING);
    expect(invoice?.amountCents).toBe(500);
    expect(invoice?.lines).toHaveLength(1);
    expect(invoice?.lines[0].pricingKey).toBe(
      VerificationPricingKey.LOCATION_CONFIRMATION_BASE,
    );
    expect(invoices).toHaveLength(1);
  });

  it("cancels pending invoice when verification is approved before payment", async () => {
    const { service, invoices } = createHarness({
      item: {
        id: "item_2",
        type: VerificationItemType.LOCATION_CONFIRMATION,
        status: "APPROVED",
        workflowStatus: VerificationItemWorkflowStatus.APPROVED,
        siteVisitRequested: false,
        decidedByUserId: "admin_1",
        verificationRequest: { requesterId: "user_2", propertyId: "listing_2" },
      },
      invoices: [
        {
          id: "inv_old",
          userId: "user_2",
          listingId: "listing_2",
          verificationItemId: "item_2",
          kind: BillingInvoiceKind.VERIFICATION_PRIORITY,
          status: BillingInvoiceStatus.PENDING,
          amountCents: 500,
          currency: "USD",
          description: "old",
          externalRef: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          cancelledAt: null,
          cancelledReason: null,
          writtenOffAt: null,
          writtenOffReason: null,
          lines: [
            {
              id: "line_old",
              pricingKey: VerificationPricingKey.LOCATION_CONFIRMATION_BASE,
              amountCents: 500,
              quantity: 1,
            },
          ],
        },
      ],
    });

    await service.createOrUpdateVerificationPriorityInvoice({
      verificationItemId: "item_2",
    });

    expect(invoices[0].status).toBe(BillingInvoiceStatus.CANCELLED);
    expect(String(invoices[0].cancelledReason)).toContain("Auto-cancelled");
  });

  it("updates existing unpaid location invoice to include addon before payment", async () => {
    const now = new Date();
    const { service, invoices } = createHarness({
      item: {
        id: "item_3",
        type: VerificationItemType.LOCATION_CONFIRMATION,
        status: "SUBMITTED",
        workflowStatus: VerificationItemWorkflowStatus.SUBMITTED,
        siteVisitRequested: true,
        decidedByUserId: null,
        verificationRequest: { requesterId: "user_3", propertyId: "listing_3" },
      },
      invoices: [
        {
          id: "inv_open",
          userId: "user_3",
          listingId: "listing_3",
          verificationItemId: "item_3",
          kind: BillingInvoiceKind.VERIFICATION_PRIORITY,
          status: BillingInvoiceStatus.PENDING,
          amountCents: 500,
          currency: "USD",
          description: "location base",
          externalRef: null,
          createdAt: now,
          updatedAt: now,
          cancelledAt: null,
          cancelledReason: null,
          writtenOffAt: null,
          writtenOffReason: null,
          lines: [
            {
              id: "line_base",
              pricingKey: VerificationPricingKey.LOCATION_CONFIRMATION_BASE,
              amountCents: 500,
              quantity: 1,
            },
          ],
        },
      ],
    });

    const invoice = await service.createOrUpdateVerificationPriorityInvoice({
      verificationItemId: "item_3",
    });

    expect(invoice?.id).toBe("inv_open");
    expect(invoice?.amountCents).toBe(2000);
    expect(invoice?.lines).toHaveLength(2);
  });

  it("creates addon-only invoice when base is already paid", async () => {
    const now = new Date();
    const { service, invoices } = createHarness({
      item: {
        id: "item_4",
        type: VerificationItemType.LOCATION_CONFIRMATION,
        status: "SUBMITTED",
        workflowStatus: VerificationItemWorkflowStatus.SUBMITTED,
        siteVisitRequested: true,
        decidedByUserId: null,
        verificationRequest: { requesterId: "user_4", propertyId: "listing_4" },
      },
      invoices: [
        {
          id: "inv_paid_base",
          userId: "user_4",
          listingId: "listing_4",
          verificationItemId: "item_4",
          kind: BillingInvoiceKind.VERIFICATION_PRIORITY,
          status: BillingInvoiceStatus.PAID,
          amountCents: 500,
          currency: "USD",
          description: "base paid",
          externalRef: "paid-base",
          createdAt: now,
          updatedAt: now,
          cancelledAt: null,
          cancelledReason: null,
          writtenOffAt: null,
          writtenOffReason: null,
          lines: [
            {
              id: "line_paid_base",
              pricingKey: VerificationPricingKey.LOCATION_CONFIRMATION_BASE,
              amountCents: 500,
              quantity: 1,
            },
          ],
        },
      ],
    });

    const invoice = await service.createOrUpdateVerificationPriorityInvoice({
      verificationItemId: "item_4",
    });

    expect(invoice?.amountCents).toBe(1500);
    expect(invoice?.lines).toHaveLength(1);
    expect(invoice?.lines[0].pricingKey).toBe(
      VerificationPricingKey.LOCATION_CONFIRMATION_SITE_VISIT_ADDON,
    );
    expect(
      invoices.filter((entry) => entry.status === BillingInvoiceStatus.PAID),
    ).toHaveLength(1);
  });

  it("does not cancel already paid invoice on approval", async () => {
    const now = new Date();
    const { service, invoices } = createHarness({
      item: {
        id: "item_5",
        type: VerificationItemType.PROOF_OF_OWNERSHIP,
        status: "APPROVED",
        workflowStatus: VerificationItemWorkflowStatus.APPROVED,
        siteVisitRequested: false,
        decidedByUserId: "admin_5",
        verificationRequest: { requesterId: "user_5", propertyId: "listing_5" },
      },
      invoices: [
        {
          id: "inv_paid",
          userId: "user_5",
          listingId: "listing_5",
          verificationItemId: "item_5",
          kind: BillingInvoiceKind.VERIFICATION_PRIORITY,
          status: BillingInvoiceStatus.PAID,
          amountCents: 500,
          currency: "USD",
          description: "proof paid",
          externalRef: "paid-proof",
          createdAt: now,
          updatedAt: now,
          cancelledAt: null,
          cancelledReason: null,
          writtenOffAt: null,
          writtenOffReason: null,
          lines: [
            {
              id: "line_paid",
              pricingKey: VerificationPricingKey.PROOF_OF_OWNERSHIP,
              amountCents: 500,
              quantity: 1,
            },
          ],
        },
      ],
    });

    const count = await service.cancelVerificationInvoicesOnDecision(
      "item_5",
      "APPROVED",
      "admin_5",
    );

    expect(count).toBe(0);
    expect(invoices[0].status).toBe(BillingInvoiceStatus.PAID);
  });

  it("marks a specific pending V2 invoice paid and records receipt", async () => {
    const now = new Date();
    const { service, invoices, receipts } = createHarness({
      item: {
        id: "item_6",
        type: VerificationItemType.PROOF_OF_OWNERSHIP,
        status: "SUBMITTED",
        workflowStatus: VerificationItemWorkflowStatus.SUBMITTED,
        siteVisitRequested: false,
        decidedByUserId: null,
        verificationRequest: { requesterId: "user_6", propertyId: "listing_6" },
      },
      invoices: [
        {
          id: "inv_pending_specific",
          userId: "user_6",
          listingId: "listing_6",
          verificationItemId: "item_6",
          kind: BillingInvoiceKind.VERIFICATION_PRIORITY,
          status: BillingInvoiceStatus.PENDING,
          amountCents: 500,
          currency: "USD",
          description: "proof pending",
          externalRef: null,
          createdAt: now,
          updatedAt: now,
          cancelledAt: null,
          cancelledReason: null,
          writtenOffAt: null,
          writtenOffReason: null,
          lines: [
            {
              id: "line_pending_specific",
              pricingKey: VerificationPricingKey.PROOF_OF_OWNERSHIP,
              amountCents: 500,
              quantity: 1,
            },
          ],
        },
      ],
    });

    const paidInvoiceId = await service.markVerificationInvoicePaidById({
      billingInvoiceId: "inv_pending_specific",
      amountCents: 500,
      currency: "USD",
      reference: "manual-proof-6",
    });

    expect(paidInvoiceId).toBe("inv_pending_specific");
    expect(invoices[0].status).toBe(BillingInvoiceStatus.PAID);
    expect(receipts).toHaveLength(1);
    expect(receipts[0].invoiceId).toBe("inv_pending_specific");
  });
});
