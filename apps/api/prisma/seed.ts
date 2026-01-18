import {
  PrismaClient,
  Role,
  AgencyStatus,
  AgencyMemberRole,
} from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Start seeding ...");

  // 1. SUPER ADMIN
  const adminPassword = await hash("Admin123!", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@propad.local" },
    update: {
      passwordHash: adminPassword,
      role: Role.ADMIN,
      isVerified: true,
      trustScore: 100,
      verificationScore: 100,
    },
    create: {
      email: "admin@propad.local",
      name: "Super Admin",
      passwordHash: adminPassword,
      role: Role.ADMIN,
      status: "ACTIVE",
      phone: "+263770000000",
      isVerified: true,
      kycStatus: "VERIFIED",
      trustScore: 100,
      verificationScore: 100,
      bio: "System Administrator",
    },
  });
  console.log("Seeded Admin:", admin.email);

  // 3. VERIFIER
  const verifierPassword = await hash("Verifier123!", 10);
  const verifier = await prisma.user.upsert({
    where: { email: "verifier@propad.local" },
    update: {
      passwordHash: verifierPassword,
      role: Role.VERIFIER,
    },
    create: {
      email: "verifier@propad.local",
      name: "Trusted Verifier",
      passwordHash: verifierPassword,
      role: Role.VERIFIER,
      status: "ACTIVE",
      phone: "+263770000002",
      trustScore: 80,
    },
  });
  console.log("Seeded Verifier:", verifier.email);

  // 4. AGENT (Independent / Company Linked)
  const agentPassword = await hash("Agent123!", 10);
  const agent = await prisma.user.upsert({
    where: { email: "agent@propad.local" },
    update: {
      passwordHash: agentPassword,
      role: Role.AGENT,
    },
    create: {
      email: "agent@propad.local",
      name: "Verified Agent",
      passwordHash: agentPassword,
      role: Role.AGENT,
      status: "ACTIVE",
      phone: "+263771111111",
      isVerified: true,
      kycStatus: "VERIFIED",
      trustScore: 90,
      verificationScore: 90,
      agentProfile: {
        create: {
          kycStatus: "VERIFIED",
          verifiedListingsCount: 10,
          rating: 4.8,
          bio: "Top performing agent in the region",
        },
      },
    },
  });

  // Ensure Agent Profile exists if user was updated but profile missing
  const agentProfile = await prisma.agentProfile.upsert({
    where: { userId: agent.id },
    update: {},
    create: {
      userId: agent.id,
      kycStatus: "VERIFIED",
      verifiedListingsCount: 10,
      rating: 4.8,
      bio: "Top performing agent in the region",
    },
  });

  console.log("Seeded Agent:", agent.email);

  // 6. STANDARD USER
  const userPassword = await hash("User123!", 10);
  const user = await prisma.user.upsert({
    where: { email: "user@propad.local" },
    update: {
      passwordHash: userPassword,
      role: Role.USER,
    },
    create: {
      email: "user@propad.local",
      name: "Standard User",
      passwordHash: userPassword,
      role: Role.USER,
      status: "ACTIVE",
      phone: "+263772222222",
    },
  });
  console.log("Seeded User:", user.email);

  // 7. REAL ESTATE COMPANY (AGENCY)
  let agency = await prisma.agency.findFirst({
    where: { slug: "prestige-properties" },
  });
  if (!agency) {
    agency = await prisma.agency.create({
      data: {
        name: "Prestige Properties",
        slug: "prestige-properties",
        email: "info@prestigeprop.local",
        phone: "+263242000000",
        address: "123 Samora Machel Ave, Harare",
        status: AgencyStatus.ACTIVE,
        trustScore: 95,
        verificationScore: 95,
        verifiedAt: new Date(),
        bio: "Zimbabwe's leading luxury property specialists.",
      },
    });
  }
  console.log("Seeded Agency:", agency.name);

  // 8. LINK AGENT TO AGENCY
  await prisma.agencyMember.upsert({
    where: {
      agencyId_userId: {
        agencyId: agency.id,
        userId: agent.id,
      },
    },
    update: {},
    create: {
      agencyId: agency.id,
      userId: agent.id,
      role: AgencyMemberRole.AGENT,
      isActive: true,
    },
  });
  console.log("Linked Agent to Agency");

  // 9. ADVERTISER
  const advertiserPassword = await hash("Advertiser123!", 10);
  const advertiser = await prisma.user.upsert({
    where: { email: "advertiser@propad.local" },
    update: {
      passwordHash: advertiserPassword,
      role: (Role as any).ADVERTISER,
    },
    create: {
      email: "advertiser@propad.local",
      name: "Premium Advertiser",
      passwordHash: advertiserPassword,
      role: (Role as any).ADVERTISER,
      status: "ACTIVE",
      phone: "+263773333333",
      isVerified: true,
      kycStatus: "VERIFIED",
    },
  });
  console.log("Seeded Advertiser:", advertiser.email);

  // 10. REWARD POOL
  const pool = await prisma.rewardPool.upsert({
    where: { id: "default-pool-1" },
    update: {},
    create: {
      id: "default-pool-1",
      name: "January 2026 Listing Bonus",
      description:
        "Rewards for agents who list verified properties in January.",
      totalUsdCents: 500000,
      spentUsdCents: 0,
      currency: "USD",
      isActive: true,
    },
  });
  console.log("Seeded Reward Pool:", pool.name);

  // 11. MOCK ADSENSE DATA
  console.log("Seeding AdSense Data...");
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const impressions = Math.floor(Math.random() * 5000) + 1000;
    const clicks = Math.floor(impressions * 0.02);
    const revenueMicros = BigInt(clicks * 500000); // 0.50 CPC

    await prisma.adSenseDailyStat.upsert({
      where: { date },
      update: {},
      create: {
        date,
        impressions,
        clicks,
        revenueMicros,
      },
    });
  }
  console.log("Seeding finished.");
}

main()
  .catch((e) => {
    console.error(e);
    throw e;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
