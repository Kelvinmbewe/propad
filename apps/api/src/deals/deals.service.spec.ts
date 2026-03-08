import { BadRequestException } from "@nestjs/common";
import { DealPartyRole, DealStage } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { DealsService } from "./deals.service";

function createPrismaMock() {
  return {
    deal: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    dealContractVersion: {
      findFirst: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
    },
    dealEvent: {
      create: vi.fn(),
    },
    dealSignature: {
      upsert: vi.fn(),
      findMany: vi.fn(),
    },
    lease: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    property: {
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  };
}

function createService(prisma: ReturnType<typeof createPrismaMock>) {
  return new DealsService(prisma as any, {} as any, {} as any, {} as any);
}

describe("DealsService stage guards", () => {
  it("blocks contract generation outside editable stages", async () => {
    const prisma = createPrismaMock();
    prisma.deal.findUnique.mockResolvedValue({
      id: "deal_1",
      landlordId: "manager_1",
      agentId: null,
      stage: DealStage.ACTIVE,
      property: {},
      tenant: { id: "tenant_1" },
      landlord: { id: "manager_1" },
      agent: null,
      dealType: "RENT",
    });
    const service = createService(prisma);

    await expect(
      service.generateContract("deal_1", "manager_1"),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.dealContractVersion.create).not.toHaveBeenCalled();
  });

  it("blocks sending contract from non-sendable stage", async () => {
    const prisma = createPrismaMock();
    prisma.deal.findUnique.mockResolvedValue({
      id: "deal_2",
      landlordId: "manager_1",
      agentId: null,
      stage: DealStage.SIGNED,
    });
    const service = createService(prisma);

    await expect(
      service.sendContract("deal_2", "manager_1"),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.dealContractVersion.findFirst).not.toHaveBeenCalled();
  });

  it("blocks signing when deal is not in signing stage", async () => {
    const prisma = createPrismaMock();
    prisma.deal.findUnique.mockResolvedValue({
      id: "deal_3",
      landlordId: "manager_1",
      agentId: null,
      tenantId: "tenant_1",
      stage: DealStage.TERMS_SET,
    });
    const service = createService(prisma);

    await expect(
      service.signDeal("deal_3", "tenant_1", {
        fullName: "Tenant One",
        agreed: true,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.dealContractVersion.findFirst).not.toHaveBeenCalled();
  });

  it("requires sent contract version before signing", async () => {
    const prisma = createPrismaMock();
    prisma.deal.findUnique.mockResolvedValue({
      id: "deal_4",
      landlordId: "manager_1",
      agentId: null,
      tenantId: "tenant_1",
      stage: DealStage.SENT,
    });
    prisma.dealContractVersion.findFirst.mockResolvedValue(null);
    const service = createService(prisma);

    await expect(
      service.signDeal("deal_4", "tenant_1", {
        fullName: "Tenant One",
        agreed: true,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("requires signed stage and both signatures before activation", async () => {
    const prisma = createPrismaMock();
    prisma.deal.findUnique
      .mockResolvedValueOnce({
        id: "deal_5",
        landlordId: "manager_1",
        agentId: null,
        stage: DealStage.SIGNING,
        signatures: [],
        property: {},
      })
      .mockResolvedValueOnce({
        id: "deal_6",
        landlordId: "manager_1",
        agentId: null,
        stage: DealStage.SIGNED,
        signatures: [{ role: DealPartyRole.APPLICANT }],
        property: {},
      });
    const service = createService(prisma);

    await expect(
      service.activateDeal("deal_5", "manager_1"),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.activateDeal("deal_6", "manager_1"),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
