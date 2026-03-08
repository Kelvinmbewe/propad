import { PrismaClient } from "@prisma/client";
import { hashContractSnapshot } from "../src/deals/contract-hash";

const prisma = new PrismaClient();

type LegacyWorkflow = {
  stage?: string;
  dealType?: "RENT" | "SALE";
  terms?: Record<string, any>;
  contractHtml?: string | null;
  signatures?: {
    manager?: { fullName?: string; signedAt?: string };
    applicant?: { fullName?: string; signedAt?: string };
  };
};

function parseLegacy(notes?: string | null): LegacyWorkflow | null {
  if (!notes) return null;
  try {
    const parsed = JSON.parse(notes);
    if (parsed && typeof parsed === "object") {
      return parsed as LegacyWorkflow;
    }
  } catch {
    return null;
  }
  return null;
}

async function run() {
  const deals = await prisma.deal.findMany({
    where: {
      migratedToV2At: null,
      notes: { not: null },
    },
  });

  let migrated = 0;
  for (const deal of deals) {
    const legacy = parseLegacy(deal.notes);
    if (!legacy) {
      await prisma.deal.update({
        where: { id: deal.id },
        data: { migratedToV2At: new Date() },
      });
      continue;
    }

    await prisma.$transaction(async (tx) => {
      if (legacy.dealType === "SALE") {
        await tx.dealTermsSale.upsert({
          where: { dealId: deal.id },
          update: {
            salePrice: legacy.terms?.salePrice
              ? Number(legacy.terms.salePrice)
              : 0,
            currency: deal.currency,
            depositAmount: legacy.terms?.deposit
              ? Number(legacy.terms.deposit)
              : null,
            closingDate: legacy.terms?.transferDate
              ? new Date(String(legacy.terms.transferDate))
              : null,
            conditions: legacy.terms ?? {},
            additionalTerms:
              typeof legacy.terms?.conditions === "string"
                ? legacy.terms.conditions
                : null,
          },
          create: {
            dealId: deal.id,
            salePrice: legacy.terms?.salePrice
              ? Number(legacy.terms.salePrice)
              : 0,
            currency: deal.currency,
            depositAmount: legacy.terms?.deposit
              ? Number(legacy.terms.deposit)
              : null,
            closingDate: legacy.terms?.transferDate
              ? new Date(String(legacy.terms.transferDate))
              : null,
            conditions: legacy.terms ?? {},
            additionalTerms:
              typeof legacy.terms?.conditions === "string"
                ? legacy.terms.conditions
                : null,
          },
        });
      } else {
        await tx.dealTermsRent.upsert({
          where: { dealId: deal.id },
          update: {
            rentAmount: legacy.terms?.monthlyRent
              ? Number(legacy.terms.monthlyRent)
              : 0,
            currency: deal.currency,
            depositAmount: legacy.terms?.deposit
              ? Number(legacy.terms.deposit)
              : null,
            leaseStartDate: legacy.terms?.leaseStart
              ? new Date(String(legacy.terms.leaseStart))
              : null,
            leaseEndDate: legacy.terms?.leaseEnd
              ? new Date(String(legacy.terms.leaseEnd))
              : null,
            paymentSchedule: legacy.terms?.paymentDueDay
              ? String(legacy.terms.paymentDueDay)
              : null,
            utilitiesIncluded: legacy.terms ?? {},
            additionalTerms:
              typeof legacy.terms?.rules === "string"
                ? legacy.terms.rules
                : null,
          },
          create: {
            dealId: deal.id,
            rentAmount: legacy.terms?.monthlyRent
              ? Number(legacy.terms.monthlyRent)
              : 0,
            currency: deal.currency,
            depositAmount: legacy.terms?.deposit
              ? Number(legacy.terms.deposit)
              : null,
            leaseStartDate: legacy.terms?.leaseStart
              ? new Date(String(legacy.terms.leaseStart))
              : null,
            leaseEndDate: legacy.terms?.leaseEnd
              ? new Date(String(legacy.terms.leaseEnd))
              : null,
            paymentSchedule: legacy.terms?.paymentDueDay
              ? String(legacy.terms.paymentDueDay)
              : null,
            utilitiesIncluded: legacy.terms ?? {},
            additionalTerms:
              typeof legacy.terms?.rules === "string"
                ? legacy.terms.rules
                : null,
          },
        });
      }

      const contractText = legacy.contractHtml || "";
      if (contractText) {
        await tx.dealContractVersion.upsert({
          where: {
            dealId_versionInt: {
              dealId: deal.id,
              versionInt: 1,
            },
          },
          update: {
            snapshotText: contractText,
            snapshotHash: hashContractSnapshot(contractText),
            status:
              legacy.stage === "SIGNED"
                ? "SIGNED"
                : legacy.stage === "CONTRACT_SENT"
                  ? "SENT"
                  : "DRAFT",
          },
          create: {
            dealId: deal.id,
            versionInt: 1,
            snapshotFormat: "HTML",
            snapshotText: contractText,
            snapshotHash: hashContractSnapshot(contractText),
            status:
              legacy.stage === "SIGNED"
                ? "SIGNED"
                : legacy.stage === "CONTRACT_SENT"
                  ? "SENT"
                  : "DRAFT",
          },
        });
      }

      if (legacy.signatures?.manager?.signedAt) {
        const exists = await tx.dealSignature.findFirst({
          where: {
            dealId: deal.id,
            role: "LISTING_MANAGER",
            signedByUserId: deal.landlordId,
          },
          select: { id: true },
        });
        if (!exists) {
          await tx.dealSignature.create({
            data: {
              dealId: deal.id,
              role: "LISTING_MANAGER",
              signedByUserId: deal.landlordId,
              signedAt: new Date(legacy.signatures.manager.signedAt),
              signatureData: {
                fullName: legacy.signatures.manager.fullName || null,
                source: "legacy-notes",
              },
            },
          });
        }
      }

      if (legacy.signatures?.applicant?.signedAt) {
        const exists = await tx.dealSignature.findFirst({
          where: {
            dealId: deal.id,
            role: "APPLICANT",
            signedByUserId: deal.tenantId,
          },
          select: { id: true },
        });
        if (!exists) {
          await tx.dealSignature.create({
            data: {
              dealId: deal.id,
              role: "APPLICANT",
              signedByUserId: deal.tenantId,
              signedAt: new Date(legacy.signatures.applicant.signedAt),
              signatureData: {
                fullName: legacy.signatures.applicant.fullName || null,
                source: "legacy-notes",
              },
            },
          });
        }
      }

      await tx.dealEvent.create({
        data: {
          dealId: deal.id,
          type:
            legacy.stage === "CANCELLED"
              ? "DEAL_CANCELLED"
              : legacy.stage === "COMPLETED"
                ? "DEAL_CLOSED"
                : "CONTRACT_SENT",
          actorUserId: deal.landlordId,
          metadata: {
            source: "legacy-notes",
            stage: legacy.stage || null,
          },
        },
      });

      await tx.deal.update({
        where: { id: deal.id },
        data: { migratedToV2At: new Date() },
      });
    });

    migrated += 1;
  }

  process.stdout.write(`Backfill complete. Migrated deals: ${migrated}\n`);
}

run()
  .catch((error) => {
    process.stderr.write(`Backfill failed: ${String(error)}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
