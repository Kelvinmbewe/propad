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
  VerificationLevel,
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

  // Look up cities
  const harareCity = await prisma.city.findFirst({
    where: { name: { contains: "Harare", mode: "insensitive" } },
  });
  const bulawayoCity = await prisma.city.findFirst({
    where: { name: { contains: "Bulawayo", mode: "insensitive" } },
  });
  const gweruCity = await prisma.city.findFirst({
    where: { name: { contains: "Gweru", mode: "insensitive" } },
  });

  // Look up provinces
  const harareProvince = await prisma.province.findFirst({
    where: { name: { contains: "Harare", mode: "insensitive" } },
  });
  const bulawayoProvince = await prisma.province.findFirst({
    where: { name: { contains: "Bulawayo", mode: "insensitive" } },
  });
  const midlandsProvince = await prisma.province.findFirst({
    where: { name: { contains: "Midlands", mode: "insensitive" } },
  });

  // Look up country
  const zimbabwe = await prisma.country.findFirst({
    where: { name: { contains: "Zimbabwe", mode: "insensitive" } },
  });

  // Look up Harare suburbs
  const borrowdaleSuburb = await prisma.suburb.findFirst({
    where: { name: "Borrowdale", cityId: harareCity?.id },
  });
  const avondaleSuburb = await prisma.suburb.findFirst({
    where: { name: "Avondale", cityId: harareCity?.id },
  });
  const mtPleasantSuburb = await prisma.suburb.findFirst({
    where: { name: "Mount Pleasant", cityId: harareCity?.id },
  });
  const highlandsSuburb = await prisma.suburb.findFirst({
    where: { name: "Highlands", cityId: harareCity?.id },
  });
  const marlboroughSuburb = await prisma.suburb.findFirst({
    where: { name: "Marlborough", cityId: harareCity?.id },
  });
  const belgraviaSub = await prisma.suburb.findFirst({
    where: { name: "Belgravia", cityId: harareCity?.id },
  });
  const chisipiteSuburb = await prisma.suburb.findFirst({
    where: { name: "Chisipite", cityId: harareCity?.id },
  });
  const greendaleSub = await prisma.suburb.findFirst({
    where: { name: "Greendale", cityId: harareCity?.id },
  });
  const hatfieldSub = await prisma.suburb.findFirst({
    where: { name: "Hatfield", cityId: harareCity?.id },
  });
  const newlandsSub = await prisma.suburb.findFirst({
    where: { name: "Newlands", cityId: harareCity?.id },
  });

  // Look up Bulawayo suburbs
  const hillsideByo = await prisma.suburb.findFirst({
    where: { name: "Hillside", cityId: bulawayoCity?.id },
  });
  const burnside = await prisma.suburb.findFirst({
    where: { name: "Burnside", cityId: bulawayoCity?.id },
  });
  const selborne = await prisma.suburb.findFirst({
    where: { name: "Selborne Park", cityId: bulawayoCity?.id },
  });
  const northEnd = await prisma.suburb.findFirst({
    where: { name: "North End", cityId: bulawayoCity?.id },
  });
  const montrose = await prisma.suburb.findFirst({
    where: { name: "Montrose", cityId: bulawayoCity?.id },
  });
  const famona = await prisma.suburb.findFirst({
    where: { name: "Famona", cityId: bulawayoCity?.id },
  });

  // Look up Gweru suburbs
  const ridgemontSuburb = await prisma.suburb.findFirst({
    where: { name: "Ridgemont", cityId: gweruCity?.id },
  });
  const ascotGweruSuburb = await prisma.suburb.findFirst({
    where: { name: "Ascot", cityId: gweruCity?.id },
  });
  const mkobaSub = await prisma.suburb.findFirst({
    where: { name: "Mkoba", cityId: gweruCity?.id },
  });
  const southdownsSub = await prisma.suburb.findFirst({
    where: { name: "Southdowns", cityId: gweruCity?.id },
  });
  const iveneSub = await prisma.suburb.findFirst({
    where: { name: "Ivene", cityId: gweruCity?.id },
  });
  const sengaSub = await prisma.suburb.findFirst({
    where: { name: "Senga", cityId: gweruCity?.id },
  });

  // Helper to build common fields
  const common = (ownerId: string) => ({
    landlordId: ownerId,
    ownerId,
    managedByType: ListingManagedByType.OWNER,
    createdByRole: "LANDLORD" as const,
    countryId: zimbabwe?.id,
  });

  // =====================================================
  // HARARE PROPERTIES (12)
  // =====================================================

  // H1: FOR_SALE, VERIFIED, Featured
  const ownerManagedProperty = await prisma.property.upsert({
    where: { id: "seed-property-owner-managed" },
    update: { lat: -17.7656, lng: 31.0881, cityId: harareCity?.id, suburbId: borrowdaleSuburb?.id, verificationLevel: VerificationLevel.VERIFIED, listingIntent: "FOR_SALE" as any },
    create: {
      id: "seed-property-owner-managed",
      title: "Modern 3 Bedroom House in Borrowdale",
      type: PropertyType.HOUSE, listingIntent: "FOR_SALE" as any,
      currency: Currency.USD, price: 185000, bedrooms: 3, bathrooms: 2, areaSqm: 180,
      amenities: ["swimming_pool", "garden", "security", "borehole"],
      description: "Beautiful modern house with pool in quiet Borrowdale neighborhood. Open plan kitchen, double garage, and mature garden.",
      status: PropertyStatus.PUBLISHED,
      ...common(user.id), verificationScore: 75, trustScore: 80, verificationLevel: VerificationLevel.VERIFIED,
      lat: -17.7656, lng: 31.0881, cityId: harareCity?.id, suburbId: borrowdaleSuburb?.id, provinceId: harareProvince?.id,
    },
  });
  console.log("✔ Seeded:", ownerManagedProperty.title);

  // H2: FOR_SALE, VERIFIED, Featured
  const agentManagedProperty = await prisma.property.upsert({
    where: { id: "seed-property-agent-managed" },
    update: { lat: -17.7894, lng: 31.0217, cityId: harareCity?.id, suburbId: avondaleSuburb?.id, verificationLevel: VerificationLevel.VERIFIED, listingIntent: "FOR_SALE" as any },
    create: {
      id: "seed-property-agent-managed",
      title: "Executive Apartment in Avondale",
      type: PropertyType.APARTMENT, listingIntent: "FOR_SALE" as any,
      currency: Currency.USD, price: 125000, bedrooms: 2, bathrooms: 2, areaSqm: 120,
      amenities: ["gym", "parking", "security", "elevator"],
      description: "Luxurious executive apartment in prime Avondale location with modern finishes throughout.",
      status: PropertyStatus.PUBLISHED,
      ...common(user.id), managedByType: ListingManagedByType.AGENT, managedById: agent.id, assignedAgentId: agent.id,
      verificationScore: 90, trustScore: 95, verificationLevel: VerificationLevel.VERIFIED,
      lat: -17.7894, lng: 31.0217, cityId: harareCity?.id, suburbId: avondaleSuburb?.id, provinceId: harareProvince?.id,
    },
  });
  console.log("✔ Seeded:", agentManagedProperty.title);

  // H3: FOR_SALE, VERIFIED (Agency managed)
  const agencyManagedProperty = await prisma.property.upsert({
    where: { id: "seed-property-agency-managed" },
    update: { lat: -17.8252, lng: 31.0335, cityId: harareCity?.id, verificationLevel: VerificationLevel.VERIFIED, listingIntent: "FOR_SALE" as any },
    create: {
      id: "seed-property-agency-managed",
      title: "Commercial Office Space in CBD",
      type: PropertyType.COMMERCIAL_OFFICE, listingIntent: "FOR_SALE" as any,
      currency: Currency.USD, price: 350000, areaSqm: 250,
      amenities: ["parking", "security", "elevator", "reception"],
      description: "Prime commercial office space in Harare CBD with 24hr security and ample parking.",
      status: PropertyStatus.PUBLISHED,
      ...common(user.id), managedByType: ListingManagedByType.AGENCY, managedById: agency.id, agencyId: agency.id, assignedAgentId: agent.id,
      verificationScore: 95, trustScore: 98, verificationLevel: VerificationLevel.VERIFIED,
      lat: -17.8252, lng: 31.0335, cityId: harareCity?.id, provinceId: harareProvince?.id,
    },
  });
  console.log("✔ Seeded:", agencyManagedProperty.title);

  // H4: TO_RENT, VERIFIED
  await prisma.property.upsert({
    where: { id: "seed-hre-rent-mtpleasant" },
    update: { listingIntent: "TO_RENT" as any, lat: -17.7833, lng: 31.0500 },
    create: {
      id: "seed-hre-rent-mtpleasant",
      title: "Spacious 4 Bed Home in Mount Pleasant",
      type: PropertyType.HOUSE, listingIntent: "TO_RENT" as any,
      currency: Currency.USD, price: 1800, bedrooms: 4, bathrooms: 3, areaSqm: 220,
      amenities: ["garden", "garage", "borehole", "security"],
      description: "Well-maintained family home in Mount Pleasant with large garden, double garage, and 24hr security.",
      status: PropertyStatus.PUBLISHED,
      ...common(user.id), verificationScore: 82, trustScore: 85, verificationLevel: VerificationLevel.VERIFIED,
      lat: -17.7833, lng: 31.0500, cityId: harareCity?.id, suburbId: mtPleasantSuburb?.id, provinceId: harareProvince?.id,
    },
  });
  console.log("✔ Seeded: Spacious 4 Bed Home in Mount Pleasant");

  // H5: TO_RENT, TRUSTED, Featured
  await prisma.property.upsert({
    where: { id: "seed-hre-rent-highlands" },
    update: { listingIntent: "TO_RENT" as any, lat: -17.8000, lng: 31.0650 },
    create: {
      id: "seed-hre-rent-highlands",
      title: "Luxury Townhouse in Highlands",
      type: PropertyType.TOWNHOUSE, listingIntent: "TO_RENT" as any,
      currency: Currency.USD, price: 2500, bedrooms: 3, bathrooms: 2, areaSqm: 180,
      amenities: ["swimming_pool", "security", "garden", "parking"],
      description: "Premium townhouse in gated Highlands complex. Modern kitchen, en-suite master, communal pool.",
      status: PropertyStatus.PUBLISHED,
      ...common(user.id), verificationScore: 92, trustScore: 95, verificationLevel: VerificationLevel.TRUSTED,
      lat: -17.8000, lng: 31.0650, cityId: harareCity?.id, suburbId: highlandsSuburb?.id, provinceId: harareProvince?.id,
    },
  });
  console.log("✔ Seeded: Luxury Townhouse in Highlands");

  // H6: FOR_SALE, BASIC
  await prisma.property.upsert({
    where: { id: "seed-hre-sale-marlborough" },
    update: { listingIntent: "FOR_SALE" as any, lat: -17.7700, lng: 30.9800 },
    create: {
      id: "seed-hre-sale-marlborough",
      title: "3 Bed Cluster in Marlborough",
      type: PropertyType.HOUSE, listingIntent: "FOR_SALE" as any,
      currency: Currency.USD, price: 95000, bedrooms: 3, bathrooms: 2, areaSqm: 140,
      amenities: ["garden", "carport", "borehole"],
      description: "Neat cluster house in Marlborough with low maintenance garden and secure parking.",
      status: PropertyStatus.PUBLISHED,
      ...common(user.id), verificationScore: 55, trustScore: 60, verificationLevel: VerificationLevel.BASIC,
      lat: -17.7700, lng: 30.9800, cityId: harareCity?.id, suburbId: marlboroughSuburb?.id, provinceId: harareProvince?.id,
    },
  });
  console.log("✔ Seeded: 3 Bed Cluster in Marlborough");

  // H7: TO_RENT, VERIFIED
  await prisma.property.upsert({
    where: { id: "seed-hre-rent-belgravia" },
    update: { listingIntent: "TO_RENT" as any, lat: -17.8100, lng: 31.0450 },
    create: {
      id: "seed-hre-rent-belgravia",
      title: "Charming Cottage in Belgravia",
      type: PropertyType.COTTAGE, listingIntent: "TO_RENT" as any,
      currency: Currency.USD, price: 650, bedrooms: 1, bathrooms: 1, areaSqm: 45,
      amenities: ["garden", "parking"],
      description: "Cozy fully furnished cottage in the heart of Belgravia. Walking distance to shops and restaurants.",
      status: PropertyStatus.PUBLISHED,
      ...common(user.id), verificationScore: 70, trustScore: 75, verificationLevel: VerificationLevel.VERIFIED,
      lat: -17.8100, lng: 31.0450, cityId: harareCity?.id, suburbId: belgraviaSub?.id, provinceId: harareProvince?.id,
    },
  });
  console.log("✔ Seeded: Charming Cottage in Belgravia");

  // H8: FOR_SALE, TRUSTED
  await prisma.property.upsert({
    where: { id: "seed-hre-sale-chisipite" },
    update: { listingIntent: "FOR_SALE" as any, lat: -17.7950, lng: 31.1100 },
    create: {
      id: "seed-hre-sale-chisipite",
      title: "5 Bed Estate Home in Chisipite",
      type: PropertyType.HOUSE, listingIntent: "FOR_SALE" as any,
      currency: Currency.USD, price: 420000, bedrooms: 5, bathrooms: 4, areaSqm: 450,
      amenities: ["swimming_pool", "garden", "borehole", "security", "staff_quarters", "tennis_court"],
      description: "Magnificent estate home on 1 acre in Chisipite. Tennis court, pool, staff quarters, and lush gardens.",
      status: PropertyStatus.PUBLISHED,
      ...common(user.id), verificationScore: 95, trustScore: 98, verificationLevel: VerificationLevel.TRUSTED,
      lat: -17.7950, lng: 31.1100, cityId: harareCity?.id, suburbId: chisipiteSuburb?.id, provinceId: harareProvince?.id,
    },
  });
  console.log("✔ Seeded: 5 Bed Estate Home in Chisipite");

  // H9: TO_RENT, NONE (not verified - shouldn't appear in verified-only)
  await prisma.property.upsert({
    where: { id: "seed-hre-rent-greendale" },
    update: { listingIntent: "TO_RENT" as any, lat: -17.8200, lng: 31.0900 },
    create: {
      id: "seed-hre-rent-greendale",
      title: "2 Bed Flat in Greendale",
      type: PropertyType.APARTMENT, listingIntent: "TO_RENT" as any,
      currency: Currency.USD, price: 450, bedrooms: 2, bathrooms: 1, areaSqm: 65,
      amenities: ["parking"],
      description: "Affordable 2 bedroom flat in Greendale with covered parking. Close to schools and shops.",
      status: PropertyStatus.PUBLISHED,
      ...common(user.id), verificationScore: 20, trustScore: 25, verificationLevel: VerificationLevel.NONE,
      lat: -17.8200, lng: 31.0900, cityId: harareCity?.id, suburbId: greendaleSub?.id, provinceId: harareProvince?.id,
    },
  });
  console.log("✔ Seeded: 2 Bed Flat in Greendale");

  // H10: FOR_SALE, VERIFIED
  await prisma.property.upsert({
    where: { id: "seed-hre-sale-hatfield" },
    update: { listingIntent: "FOR_SALE" as any, lat: -17.8220, lng: 31.0750 },
    create: {
      id: "seed-hre-sale-hatfield",
      title: "Modern Townhouse in Hatfield",
      type: PropertyType.TOWNHOUSE, listingIntent: "FOR_SALE" as any,
      currency: Currency.USD, price: 78000, bedrooms: 3, bathrooms: 2, areaSqm: 130,
      amenities: ["garage", "garden", "security"],
      description: "Newly built townhouse in gated complex in Hatfield. Open plan living, fitted kitchen.",
      status: PropertyStatus.PUBLISHED,
      ...common(user.id), verificationScore: 78, trustScore: 82, verificationLevel: VerificationLevel.VERIFIED,
      lat: -17.8220, lng: 31.0750, cityId: harareCity?.id, suburbId: hatfieldSub?.id, provinceId: harareProvince?.id,
    },
  });
  console.log("✔ Seeded: Modern Townhouse in Hatfield");

  // H11: TO_RENT, BASIC
  await prisma.property.upsert({
    where: { id: "seed-hre-rent-newlands" },
    update: { listingIntent: "TO_RENT" as any, lat: -17.7900, lng: 31.0700 },
    create: {
      id: "seed-hre-rent-newlands",
      title: "Executive 3 Bed in Newlands",
      type: PropertyType.HOUSE, listingIntent: "TO_RENT" as any,
      currency: Currency.USD, price: 1500, bedrooms: 3, bathrooms: 2, areaSqm: 160,
      amenities: ["garden", "garage", "borehole", "security"],
      description: "Well-maintained executive home in Newlands with beautiful garden and double garage.",
      status: PropertyStatus.PUBLISHED,
      ...common(user.id), verificationScore: 58, trustScore: 62, verificationLevel: VerificationLevel.BASIC,
      lat: -17.7900, lng: 31.0700, cityId: harareCity?.id, suburbId: newlandsSub?.id, provinceId: harareProvince?.id,
    },
  });
  console.log("✔ Seeded: Executive 3 Bed in Newlands");

  // H12: FOR_SALE, VERIFIED
  await prisma.property.upsert({
    where: { id: "seed-hre-sale-borrowdale-brook" },
    update: { listingIntent: "FOR_SALE" as any, lat: -17.7580, lng: 31.1000 },
    create: {
      id: "seed-hre-sale-borrowdale-brook",
      title: "4 Bed Villa in Borrowdale Brooke",
      type: PropertyType.HOUSE, listingIntent: "FOR_SALE" as any,
      currency: Currency.USD, price: 295000, bedrooms: 4, bathrooms: 3, areaSqm: 320,
      amenities: ["swimming_pool", "garden", "borehole", "security", "staff_quarters"],
      description: "Elegant 4 bedroom villa in prestigious Borrowdale Brooke with heated pool and landscaped garden.",
      status: PropertyStatus.PUBLISHED,
      ...common(user.id), managedByType: ListingManagedByType.AGENCY, managedById: agency.id, agencyId: agency.id, assignedAgentId: agent.id,
      verificationScore: 88, trustScore: 92, verificationLevel: VerificationLevel.VERIFIED,
      lat: -17.7580, lng: 31.1000, cityId: harareCity?.id, provinceId: harareProvince?.id,
    },
  });
  console.log("✔ Seeded: 4 Bed Villa in Borrowdale Brooke");

  // =====================================================
  // BULAWAYO PROPERTIES (6)
  // =====================================================

  // B1: FOR_SALE, VERIFIED, Featured
  await prisma.property.upsert({
    where: { id: "seed-byo-sale-hillside" },
    update: { listingIntent: "FOR_SALE" as any, lat: -20.1700, lng: 28.5900 },
    create: {
      id: "seed-byo-sale-hillside",
      title: "Charming 4 Bed House in Hillside, Bulawayo",
      type: PropertyType.HOUSE, listingIntent: "FOR_SALE" as any,
      currency: Currency.USD, price: 115000, bedrooms: 4, bathrooms: 2, areaSqm: 200,
      amenities: ["garden", "garage", "borehole", "security"],
      description: "Beautiful family home in prime Hillside suburb with established garden and double garage.",
      status: PropertyStatus.PUBLISHED,
      ...common(user.id), verificationScore: 85, trustScore: 88, verificationLevel: VerificationLevel.VERIFIED,
      lat: -20.1700, lng: 28.5900, cityId: bulawayoCity?.id, suburbId: hillsideByo?.id, provinceId: bulawayoProvince?.id,
    },
  });
  console.log("✔ Seeded: Charming 4 Bed House in Hillside, Bulawayo");

  // B2: TO_RENT, TRUSTED, Featured
  await prisma.property.upsert({
    where: { id: "seed-byo-rent-burnside" },
    update: { listingIntent: "TO_RENT" as any, lat: -20.1550, lng: 28.5750 },
    create: {
      id: "seed-byo-rent-burnside",
      title: "Modern Apartment in Burnside, Bulawayo",
      type: PropertyType.APARTMENT, listingIntent: "TO_RENT" as any,
      currency: Currency.USD, price: 600, bedrooms: 2, bathrooms: 1, areaSqm: 80,
      amenities: ["parking", "security", "garden"],
      description: "Stylish 2 bed apartment in quiet Burnside complex with communal gardens and secure parking.",
      status: PropertyStatus.PUBLISHED,
      ...common(user.id), verificationScore: 90, trustScore: 93, verificationLevel: VerificationLevel.TRUSTED,
      lat: -20.1550, lng: 28.5750, cityId: bulawayoCity?.id, suburbId: burnside?.id, provinceId: bulawayoProvince?.id,
    },
  });
  console.log("✔ Seeded: Modern Apartment in Burnside, Bulawayo");

  // B3: FOR_SALE, VERIFIED
  await prisma.property.upsert({
    where: { id: "seed-byo-sale-selborne" },
    update: { listingIntent: "FOR_SALE" as any, lat: -20.1650, lng: 28.6000 },
    create: {
      id: "seed-byo-sale-selborne",
      title: "3 Bed Townhouse in Selborne Park",
      type: PropertyType.TOWNHOUSE, listingIntent: "FOR_SALE" as any,
      currency: Currency.USD, price: 65000, bedrooms: 3, bathrooms: 2, areaSqm: 130,
      amenities: ["garage", "garden", "security"],
      description: "Well-priced townhouse in Selborne Park with easy access to CBD and schools.",
      status: PropertyStatus.PUBLISHED,
      ...common(user.id), verificationScore: 72, trustScore: 78, verificationLevel: VerificationLevel.VERIFIED,
      lat: -20.1650, lng: 28.6000, cityId: bulawayoCity?.id, suburbId: selborne?.id, provinceId: bulawayoProvince?.id,
    },
  });
  console.log("✔ Seeded: 3 Bed Townhouse in Selborne Park");

  // B4: TO_RENT, BASIC
  await prisma.property.upsert({
    where: { id: "seed-byo-rent-northend" },
    update: { listingIntent: "TO_RENT" as any, lat: -20.1400, lng: 28.5800 },
    create: {
      id: "seed-byo-rent-northend",
      title: "Cottage in North End, Bulawayo",
      type: PropertyType.COTTAGE, listingIntent: "TO_RENT" as any,
      currency: Currency.USD, price: 280, bedrooms: 1, bathrooms: 1, areaSqm: 35,
      amenities: ["parking"],
      description: "Cozy furnished cottage in North End, ideal for single professional. Water included.",
      status: PropertyStatus.PUBLISHED,
      ...common(user.id), verificationScore: 45, trustScore: 50, verificationLevel: VerificationLevel.BASIC,
      lat: -20.1400, lng: 28.5800, cityId: bulawayoCity?.id, suburbId: northEnd?.id, provinceId: bulawayoProvince?.id,
    },
  });
  console.log("✔ Seeded: Cottage in North End, Bulawayo");

  // B5: FOR_SALE, NONE
  await prisma.property.upsert({
    where: { id: "seed-byo-sale-montrose" },
    update: { listingIntent: "FOR_SALE" as any, lat: -20.1580, lng: 28.5650 },
    create: {
      id: "seed-byo-sale-montrose",
      title: "Fixer-Upper in Montrose, Bulawayo",
      type: PropertyType.HOUSE, listingIntent: "FOR_SALE" as any,
      currency: Currency.USD, price: 42000, bedrooms: 3, bathrooms: 1, areaSqm: 110,
      amenities: ["garden"],
      description: "3 bed house on large stand requiring renovation. Great potential in desirable Montrose area.",
      status: PropertyStatus.PUBLISHED,
      ...common(user.id), verificationScore: 15, trustScore: 20, verificationLevel: VerificationLevel.NONE,
      lat: -20.1580, lng: 28.5650, cityId: bulawayoCity?.id, suburbId: montrose?.id, provinceId: bulawayoProvince?.id,
    },
  });
  console.log("✔ Seeded: Fixer-Upper in Montrose, Bulawayo");

  // B6: TO_RENT, VERIFIED
  await prisma.property.upsert({
    where: { id: "seed-byo-rent-famona" },
    update: { listingIntent: "TO_RENT" as any, lat: -20.1620, lng: 28.5500 },
    create: {
      id: "seed-byo-rent-famona",
      title: "Office Space in Famona, Bulawayo",
      type: PropertyType.COMMERCIAL_OFFICE, listingIntent: "TO_RENT" as any,
      currency: Currency.USD, price: 800, areaSqm: 100,
      amenities: ["parking", "air_conditioning", "security"],
      description: "Professional office space in Famona business district. 3 rooms plus reception. Fibre-ready.",
      status: PropertyStatus.PUBLISHED,
      ...common(user.id), managedByType: ListingManagedByType.AGENT, managedById: agent.id, assignedAgentId: agent.id,
      verificationScore: 80, trustScore: 84, verificationLevel: VerificationLevel.VERIFIED,
      lat: -20.1620, lng: 28.5500, cityId: bulawayoCity?.id, suburbId: famona?.id, provinceId: bulawayoProvince?.id,
    },
  });
  console.log("✔ Seeded: Office Space in Famona, Bulawayo");

  // =====================================================
  // GWERU PROPERTIES (6)
  // =====================================================

  // G1: FOR_SALE, VERIFIED
  const gweruResidentialProperty = await prisma.property.upsert({
    where: { id: "seed-property-gweru-residential" },
    update: { lat: -19.4402, lng: 29.8184, cityId: gweruCity?.id, suburbId: ridgemontSuburb?.id, verificationLevel: VerificationLevel.VERIFIED, listingIntent: "FOR_SALE" as any },
    create: {
      id: "seed-property-gweru-residential",
      title: "Family Home in Ridgemont, Gweru",
      type: PropertyType.HOUSE, listingIntent: "FOR_SALE" as any,
      currency: Currency.USD, price: 75000, bedrooms: 4, bathrooms: 2, areaSqm: 200,
      amenities: ["garden", "garage", "borehole", "solar"],
      description: "Spacious family home in the quiet Ridgemont suburb of Gweru with modern finishes and solar backup.",
      status: PropertyStatus.PUBLISHED,
      ...common(user.id), verificationScore: 85, trustScore: 88, verificationLevel: VerificationLevel.VERIFIED,
      lat: -19.4402, lng: 29.8184, cityId: gweruCity?.id, suburbId: ridgemontSuburb?.id, provinceId: midlandsProvince?.id,
    },
  });
  console.log("✔ Seeded:", gweruResidentialProperty.title);

  // G2: TO_RENT, TRUSTED, Featured
  const gweruCommercialProperty = await prisma.property.upsert({
    where: { id: "seed-property-gweru-commercial" },
    update: { lat: -19.4450, lng: 29.8100, cityId: gweruCity?.id, suburbId: ascotGweruSuburb?.id, verificationLevel: VerificationLevel.TRUSTED, listingIntent: "TO_RENT" as any },
    create: {
      id: "seed-property-gweru-commercial",
      title: "Retail Space in Ascot, Gweru",
      type: PropertyType.COMMERCIAL_RETAIL, listingIntent: "TO_RENT" as any,
      currency: Currency.USD, price: 1200, areaSqm: 120,
      amenities: ["parking", "security", "air_conditioning"],
      description: "Prime retail space on busy Ascot road in Gweru, ideal for shops or offices.",
      status: PropertyStatus.PUBLISHED,
      ...common(user.id), managedByType: ListingManagedByType.AGENT, managedById: agent.id, assignedAgentId: agent.id,
      verificationScore: 78, trustScore: 82, verificationLevel: VerificationLevel.TRUSTED,
      lat: -19.4450, lng: 29.8100, cityId: gweruCity?.id, suburbId: ascotGweruSuburb?.id, provinceId: midlandsProvince?.id,
    },
  });
  console.log("✔ Seeded:", gweruCommercialProperty.title);

  // G3: TO_RENT, VERIFIED
  await prisma.property.upsert({
    where: { id: "seed-gwe-rent-mkoba" },
    update: { listingIntent: "TO_RENT" as any, lat: -19.4600, lng: 29.7800 },
    create: {
      id: "seed-gwe-rent-mkoba",
      title: "3 Bed House in Mkoba, Gweru",
      type: PropertyType.HOUSE, listingIntent: "TO_RENT" as any,
      currency: Currency.USD, price: 350, bedrooms: 3, bathrooms: 1, areaSqm: 90,
      amenities: ["garden", "carport"],
      description: "Affordable 3 bed house in Mkoba with spacious yard. Close to schools and transport.",
      status: PropertyStatus.PUBLISHED,
      ...common(user.id), verificationScore: 68, trustScore: 72, verificationLevel: VerificationLevel.VERIFIED,
      lat: -19.4600, lng: 29.7800, cityId: gweruCity?.id, suburbId: mkobaSub?.id, provinceId: midlandsProvince?.id,
    },
  });
  console.log("✔ Seeded: 3 Bed House in Mkoba, Gweru");

  // G4: FOR_SALE, BASIC
  await prisma.property.upsert({
    where: { id: "seed-gwe-sale-southdowns" },
    update: { listingIntent: "FOR_SALE" as any, lat: -19.4700, lng: 29.8200 },
    create: {
      id: "seed-gwe-sale-southdowns",
      title: "4 Bed House in Southdowns, Gweru",
      type: PropertyType.HOUSE, listingIntent: "FOR_SALE" as any,
      currency: Currency.USD, price: 55000, bedrooms: 4, bathrooms: 2, areaSqm: 170,
      amenities: ["garden", "garage", "borehole"],
      description: "Solid 4 bed family home in Southdowns with large yard and double garage.",
      status: PropertyStatus.PUBLISHED,
      ...common(user.id), verificationScore: 50, trustScore: 55, verificationLevel: VerificationLevel.BASIC,
      lat: -19.4700, lng: 29.8200, cityId: gweruCity?.id, suburbId: southdownsSub?.id, provinceId: midlandsProvince?.id,
    },
  });
  console.log("✔ Seeded: 4 Bed House in Southdowns, Gweru");

  // G5: TO_RENT, NONE
  await prisma.property.upsert({
    where: { id: "seed-gwe-rent-ivene" },
    update: { listingIntent: "TO_RENT" as any, lat: -19.4350, lng: 29.7900 },
    create: {
      id: "seed-gwe-rent-ivene",
      title: "Room to Rent in Ivene, Gweru",
      type: PropertyType.ROOM, listingIntent: "TO_RENT" as any,
      currency: Currency.USD, price: 80, bedrooms: 1, bathrooms: 1, areaSqm: 16,
      amenities: [],
      description: "Single room available in shared house in Ivene. Suitable for students or young professionals.",
      status: PropertyStatus.PUBLISHED,
      ...common(user.id), verificationScore: 10, trustScore: 15, verificationLevel: VerificationLevel.NONE,
      lat: -19.4350, lng: 29.7900, cityId: gweruCity?.id, suburbId: iveneSub?.id, provinceId: midlandsProvince?.id,
    },
  });
  console.log("✔ Seeded: Room to Rent in Ivene, Gweru");

  // G6: FOR_SALE, VERIFIED
  await prisma.property.upsert({
    where: { id: "seed-gwe-sale-senga" },
    update: { listingIntent: "FOR_SALE" as any, lat: -19.4500, lng: 29.8300 },
    create: {
      id: "seed-gwe-sale-senga",
      title: "3 Bed Home in Senga, Gweru",
      type: PropertyType.HOUSE, listingIntent: "FOR_SALE" as any,
      currency: Currency.USD, price: 38000, bedrooms: 3, bathrooms: 1, areaSqm: 100,
      amenities: ["garden", "carport"],
      description: "Well-maintained 3 bedroom home in Senga with established fruit trees and solar geyser.",
      status: PropertyStatus.PUBLISHED,
      ...common(user.id), verificationScore: 70, trustScore: 74, verificationLevel: VerificationLevel.VERIFIED,
      lat: -19.4500, lng: 29.8300, cityId: gweruCity?.id, suburbId: sengaSub?.id, provinceId: midlandsProvince?.id,
    },
  });
  console.log("✔ Seeded: 3 Bed Home in Senga, Gweru");

  // =====================================================
  // FEATURED LISTINGS
  // =====================================================
  console.log("\n▶ Seeding featured listings...");

  const featuredProperties = [
    { id: "seed-property-owner-managed", priority: 3, label: "Borrowdale House" },
    { id: "seed-property-agent-managed", priority: 2, label: "Avondale Apartment" },
    { id: "seed-hre-rent-highlands", priority: 1, label: "Highlands Townhouse" },
    { id: "seed-byo-sale-hillside", priority: 2, label: "Hillside Bulawayo" },
    { id: "seed-byo-rent-burnside", priority: 1, label: "Burnside Apartment" },
    { id: "seed-property-gweru-commercial", priority: 1, label: "Gweru Retail" },
    { id: "seed-hre-sale-chisipite", priority: 3, label: "Chisipite Estate" },
  ];

  const featuredStart = new Date();
  const featuredEnd = new Date(featuredStart.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days

  for (const fp of featuredProperties) {
    await prisma.featuredListing.upsert({
      where: { listingId: fp.id },
      update: { priorityLevel: fp.priority, status: "ACTIVE", endsAt: featuredEnd },
      create: {
        listingId: fp.id,
        startsAt: featuredStart,
        endsAt: featuredEnd,
        priorityLevel: fp.priority,
        status: "ACTIVE",
      },
    });
    console.log(`✔ Featured: ${fp.label} (priority ${fp.priority})`);
  }

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
    update: { lat: -17.8150, lng: 31.0456 },
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
      lat: -17.8150,
      lng: 31.0456,
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
