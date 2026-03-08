import { PrismaClient, VerificationPricingKey } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const defaults: Array<{
    key: VerificationPricingKey;
    amountCents: number;
    description: string;
  }> = [
    {
      key: VerificationPricingKey.LOCATION_CONFIRMATION_BASE,
      amountCents: 500,
      description: "Location confirmation base fee",
    },
    {
      key: VerificationPricingKey.LOCATION_CONFIRMATION_SITE_VISIT_ADDON,
      amountCents: 1500,
      description: "Site visit add-on for location confirmation",
    },
    {
      key: VerificationPricingKey.PROPERTY_PHOTOS,
      amountCents: 500,
      description: "Property photos verification fee",
    },
    {
      key: VerificationPricingKey.PROOF_OF_OWNERSHIP,
      amountCents: 500,
      description: "Proof of ownership verification fee",
    },
    {
      key: VerificationPricingKey.PROPERTY_VERIFICATION,
      amountCents: 500,
      description: "Fallback property verification fee",
    },
  ];

  for (const row of defaults) {
    await prisma.verificationPricing.upsert({
      where: { key: row.key },
      update: {
        amountCents: row.amountCents,
        description: row.description,
        currency: "USD",
        isActive: true,
      },
      create: {
        key: row.key,
        amountCents: row.amountCents,
        description: row.description,
        currency: "USD",
        isActive: true,
      },
    });
  }

  console.log("Seeded verification pricing V2 defaults");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
