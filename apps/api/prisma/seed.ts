import {
  PrismaClient,
  Role,
  AgencyStatus,
  AgencyMemberRole,
  ListingManagedByType,
  ListingManagementStatus,
  PropertyType,
  PropertyStatus,
  Currency,
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

  // 11. SAMPLE PROPERTIES WITH LISTING MANAGEMENT
  console.log("Seeding sample properties with listing management...");

  // Property 1: Owner-managed listing (landlord manages their own property)
  const ownerManagedProperty = await prisma.property.upsert({
    where: { id: "seed-property-owner-managed" },
    update: {},
    create: {
      id: "seed-property-owner-managed",
      title: "Modern 3 Bedroom House in Borrowdale",
      type: PropertyType.HOUSE,
      currency: Currency.USD,
      price: 1500,
      bedrooms: 3,
      bathrooms: 2,
      areaSqm: 180,
      amenities: ["swimming_pool", "garden", "security", "borehole"],
      description: "Beautiful modern house with pool in quiet Borrowdale neighborhood.",
      status: PropertyStatus.PUBLISHED,
      landlordId: user.id,
      ownerId: user.id,
      managedByType: ListingManagedByType.OWNER,
      verificationScore: 75,
      trustScore: 80,
      createdByRole: "LANDLORD",
    },
  });
  console.log("Seeded Owner-Managed Property:", ownerManagedProperty.title);

  // Property 2: Agent-managed listing (agent manages on behalf of owner)
  const agentManagedProperty = await prisma.property.upsert({
    where: { id: "seed-property-agent-managed" },
    update: {},
    create: {
      id: "seed-property-agent-managed",
      title: "Executive Apartment in Avondale",
      type: PropertyType.APARTMENT,
      currency: Currency.USD,
      price: 1200,
      bedrooms: 2,
      bathrooms: 2,
      areaSqm: 120,
      amenities: ["gym", "parking", "security", "elevator"],
      description: "Luxurious executive apartment in prime Avondale location.",
      status: PropertyStatus.PUBLISHED,
      landlordId: user.id,
      ownerId: user.id,
      managedByType: ListingManagedByType.AGENT,
      managedById: agent.id,
      assignedAgentId: agent.id,
      verificationScore: 90,
      trustScore: 95,
      createdByRole: "LANDLORD",
    },
  });
  console.log("Seeded Agent-Managed Property:", agentManagedProperty.title);

  // Property 3: Agency-managed listing (agency manages the property)
  const agencyManagedProperty = await prisma.property.upsert({
    where: { id: "seed-property-agency-managed" },
    update: {},
    create: {
      id: "seed-property-agency-managed",
      title: "Commercial Office Space in CBD",
      type: PropertyType.COMMERCIAL_OFFICE,
      currency: Currency.USD,
      price: 3500,
      areaSqm: 250,
      amenities: ["parking", "security", "elevator", "reception"],
      description: "Prime commercial office space in Harare CBD.",
      status: PropertyStatus.PUBLISHED,
      landlordId: user.id,
      ownerId: user.id,
      managedByType: ListingManagedByType.AGENCY,
      managedById: agency.id,
      agencyId: agency.id,
      assignedAgentId: agent.id,
      verificationScore: 95,
      trustScore: 98,
      createdByRole: "LANDLORD",
    },
  });
  console.log("Seeded Agency-Managed Property:", agencyManagedProperty.title);

  // 12. LISTING MANAGEMENT ASSIGNMENTS
  console.log("Seeding listing management assignments...");

  // Assignment for agent-managed property (accepted)
  await prisma.listingManagementAssignment.upsert({
    where: { id: "seed-lma-agent-accepted" },
    update: {},
    create: {
      id: "seed-lma-agent-accepted",
      propertyId: agentManagedProperty.id,
      ownerId: user.id,
      managedByType: ListingManagedByType.AGENT,
      managedById: agent.id,
      assignedAgentId: agent.id,
      serviceFeeUsdCents: 10000, // $100 fee
      landlordPaysFee: true,
      status: ListingManagementStatus.ACCEPTED,
      createdById: user.id,
      acceptedById: agent.id,
      acceptedAt: new Date(),
      notes: "Agent accepted to manage this listing.",
    },
  });
  console.log("Seeded Agent Management Assignment (Accepted)");

  // Assignment for agency-managed property (accepted)
  await prisma.listingManagementAssignment.upsert({
    where: { id: "seed-lma-agency-accepted" },
    update: {},
    create: {
      id: "seed-lma-agency-accepted",
      propertyId: agencyManagedProperty.id,
      ownerId: user.id,
      managedByType: ListingManagedByType.AGENCY,
      managedById: agency.id,
      assignedAgentId: agent.id,
      serviceFeeUsdCents: 25000, // $250 fee
      landlordPaysFee: true,
      status: ListingManagementStatus.ACCEPTED,
      createdById: user.id,
      acceptedById: agent.id,
      acceptedAt: new Date(),
      notes: "Agency assigned to manage this commercial property.",
    },
  });
  console.log("Seeded Agency Management Assignment (Accepted)");

  // Assignment pending approval (to demonstrate the workflow)
  const pendingProperty = await prisma.property.upsert({
    where: { id: "seed-property-pending-assignment" },
    update: {},
    create: {
      id: "seed-property-pending-assignment",
      title: "Townhouse in Highlands",
      type: PropertyType.TOWNHOUSE,
      currency: Currency.USD,
      price: 1800,
      bedrooms: 4,
      bathrooms: 3,
      areaSqm: 200,
      amenities: ["garden", "garage", "security"],
      description: "Spacious townhouse in serene Highlands area.",
      status: PropertyStatus.DRAFT,
      landlordId: user.id,
      ownerId: user.id,
      managedByType: ListingManagedByType.OWNER,
      createdByRole: "LANDLORD",
    },
  });
  console.log("Seeded Pending Property:", pendingProperty.title);

  await prisma.listingManagementAssignment.upsert({
    where: { id: "seed-lma-pending" },
    update: {},
    create: {
      id: "seed-lma-pending",
      propertyId: pendingProperty.id,
      ownerId: user.id,
      managedByType: ListingManagedByType.AGENT,
      managedById: agent.id,
      assignedAgentId: agent.id,
      serviceFeeUsdCents: 15000, // $150 fee
      landlordPaysFee: false, // Tenant pays
      status: ListingManagementStatus.CREATED,
      createdById: user.id,
      notes: "Pending agent acceptance for property management.",
    },
  });
  console.log("Seeded Pending Management Assignment");

  // 13. MOCK ADSENSE DATA
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
