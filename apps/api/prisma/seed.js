const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

function extractBlock(text, startToken) {
  const idx = text.indexOf(startToken);
  if (idx === -1) return null;
  const rest = text.slice(idx);
  const open = rest.indexOf("{");
  if (open === -1) return null;
  let depth = 0;
  for (let i = open; i < rest.length; i++) {
    const ch = rest[i];
    if (ch === "{") depth++;
    if (ch === "}") depth--;
    if (depth === 0) return rest.slice(open + 1, i);
  }
  return null;
}

function parseEnumValues(schema, enumName) {
  const block = extractBlock(schema, `enum ${enumName}`);
  if (!block) return [];
  return block
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("//"))
    .map((l) => l.split(/\s+/)[0])
    .filter((v) => /^[A-Z0-9_]+$/.test(v));
}

function parseUserFields(schema) {
  const block = extractBlock(schema, "model User");
  if (!block) return [];
  return block
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("//"))
    .map((l) => l.replace(/\s+/g, " "))
    .filter((l) => !l.startsWith("@@"))
    .map((l) => {
      const [name, typeRaw] = l.split(" ");
      if (!name || !typeRaw) return null;
      const isList = typeRaw.endsWith("[]");
      const isOptional = typeRaw.endsWith("?");
      const type = typeRaw.replace(/\?|\[\]/g, "");
      const attrs = l.slice((name + " " + typeRaw).length).trim();
      return { name, type, isOptional, isList, attrs, raw: l };
    })
    .filter(Boolean);
}

function pickPasswordField(userFields) {
  const candidates = ["passwordHash", "hashedPassword", "hash", "password"];
  const names = new Set(userFields.map((f) => f.name));
  return candidates.find((c) => names.has(c)) || null;
}

function pickRoleField(userFields) {
  const candidates = ["role", "userRole"];
  const names = new Set(userFields.map((f) => f.name));
  return candidates.find((c) => names.has(c)) || null;
}

async function hashPassword(pw) {
  try {
    const bcryptjs = require("bcryptjs");
    const salt = bcryptjs.genSaltSync(10);
    return bcryptjs.hashSync(pw, salt);
  } catch (_) {
    const bcrypt = require("bcrypt");
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(pw, salt);
  }
}

function buildCreateData(
  userFields,
  passwordField,
  roleField,
  roleValue,
  user,
) {
  const data = {};

  const setIfPresent = (key, value) => {
    if (userFields.some((f) => f.name === key)) data[key] = value;
  };

  setIfPresent("email", user.email);
  setIfPresent("name", user.name);
  setIfPresent("firstName", user.name.split(" ")[0]);
  setIfPresent("lastName", user.name.split(" ").slice(1).join(" ") || "User");
  setIfPresent("username", user.email.split("@")[0]);
  setIfPresent("phone", user.phone || "+263000000000");

  setIfPresent("active", true);
  setIfPresent("isActive", true);
  setIfPresent("status", "ACTIVE");

  if (roleField && roleValue) data[roleField] = roleValue;

  if (passwordField) data[passwordField] = "__TO_BE_HASHED__";

  return data;
}

async function main() {
  const prisma = new PrismaClient();

  const schemaPath = path.resolve(
    __dirname,
    "schema.prisma",
  );
  const schema = fs.readFileSync(schemaPath, "utf8");

  const userFields = parseUserFields(schema);
  if (!userFields.length) {
    throw new Error(
      "Could not find `model User` in schema.prisma. Cannot seed demo users.",
    );
  }

  const passwordField = pickPasswordField(userFields);
  const roleField = pickRoleField(userFields);

  const roleEnumValues = parseEnumValues(schema, "Role");
  const hasRoleEnum = roleEnumValues.length > 0;

  const resolveRole = (preferred) => {
    if (!roleField) return null;
    if (hasRoleEnum) {
      if (roleEnumValues.includes(preferred)) return preferred;
      return roleEnumValues[0];
    }
    return preferred;
  };

  const demo = [
    {
      email: "admin@propad.local",
      name: "Admin User",
      password: "Admin123!",
      role: resolveRole("ADMIN"),
    },
    {
      email: "verifier@propad.local",
      name: "Verifier User",
      password: "Verifier123!",
      role: resolveRole("VERIFIER"),
    },
    {
      email: "agent@propad.local",
      name: "Agent User",
      password: "Agent123!",
      role: resolveRole("AGENT"),
    },
    {
      email: "user@propad.local",
      name: "Demo User",
      password: "User123!",
      role: resolveRole("USER"),
    },
    {
      email: "advertiser@propad.local",
      name: "Advertiser User",
      password: "Advertiser123!",
      role: resolveRole("ADVERTISER"),
    },
  ];

  if (!userFields.some((f) => f.name === "email")) {
    throw new Error(
      "User model has no `email` field. Update seed.js to match your schema.",
    );
  }

  console.log("▶ Running Propad seed (demo users)...");
  console.log(`• Detected password field: ${passwordField || "(none found)"}`);
  console.log(
    `• Detected role field: ${roleField || "(none found)"} ${hasRoleEnum ? "(enum Role)" : ""}`,
  );

  // Store user references for later use
  const seededUsers = {};

  for (const u of demo) {
    const createData = buildCreateData(
      userFields,
      passwordField,
      roleField,
      u.role,
      u,
    );

    if (passwordField) {
      const hashed = await hashPassword(u.password);
      createData[passwordField] = hashed;
    }

    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        ...(roleField && u.role ? { [roleField]: u.role } : {}),
        ...(u.name ? { name: u.name } : {}),
        ...(passwordField
          ? { [passwordField]: createData[passwordField] }
          : {}),
      },
      create: createData,
    });

    seededUsers[u.email] = user;
    console.log(`✔ Upserted ${u.email}`);
  }

  // 2. SEED AGENCY
  console.log("\n▶ Seeding agency...");
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
        status: "ACTIVE",
        trustScore: 95,
        verificationScore: 95,
        verifiedAt: new Date(),
        bio: "Zimbabwe's leading luxury property specialists.",
      },
    });
    console.log(`✔ Created agency: ${agency.name}`);
  } else {
    console.log(`✔ Agency already exists: ${agency.name}`);
  }

  // Link agent to agency
  const agentUser = seededUsers["agent@propad.local"];
  if (agentUser) {
    await prisma.agencyMember.upsert({
      where: {
        agencyId_userId: {
          agencyId: agency.id,
          userId: agentUser.id,
        },
      },
      update: {},
      create: {
        agencyId: agency.id,
        userId: agentUser.id,
        role: "AGENT",
        isActive: true,
      },
    });
    console.log("✔ Linked Agent to Agency");
  }

  // 3. SEED SAMPLE PROPERTIES WITH LISTING MANAGEMENT
  console.log("\n▶ Seeding sample properties with listing management...");

  const demoUser = seededUsers["user@propad.local"];

  if (demoUser && agentUser) {
    // Property 1: Owner-managed listing
    const ownerManagedProperty = await prisma.property.upsert({
      where: { id: "seed-property-owner-managed" },
      update: {},
      create: {
        id: "seed-property-owner-managed",
        title: "Modern 3 Bedroom House in Borrowdale",
        type: "HOUSE",
        currency: "USD",
        price: 1500,
        bedrooms: 3,
        bathrooms: 2,
        areaSqm: 180,
        amenities: ["swimming_pool", "garden", "security", "borehole"],
        description: "Beautiful modern house with pool in quiet Borrowdale neighborhood.",
        status: "PUBLISHED",
        landlordId: demoUser.id,
        ownerId: demoUser.id,
        managedByType: "OWNER",
        verificationScore: 75,
        trustScore: 80,
        createdByRole: "LANDLORD",
      },
    });
    console.log(`✔ Seeded property: ${ownerManagedProperty.title}`);

    // Property 2: Agent-managed listing
    const agentManagedProperty = await prisma.property.upsert({
      where: { id: "seed-property-agent-managed" },
      update: {},
      create: {
        id: "seed-property-agent-managed",
        title: "Executive Apartment in Avondale",
        type: "APARTMENT",
        currency: "USD",
        price: 1200,
        bedrooms: 2,
        bathrooms: 2,
        areaSqm: 120,
        amenities: ["gym", "parking", "security", "elevator"],
        description: "Luxurious executive apartment in prime Avondale location.",
        status: "PUBLISHED",
        landlordId: demoUser.id,
        ownerId: demoUser.id,
        managedByType: "AGENT",
        managedById: agentUser.id,
        assignedAgentId: agentUser.id,
        verificationScore: 90,
        trustScore: 95,
        createdByRole: "LANDLORD",
      },
    });
    console.log(`✔ Seeded property: ${agentManagedProperty.title}`);

    // Property 3: Agency-managed listing
    const agencyManagedProperty = await prisma.property.upsert({
      where: { id: "seed-property-agency-managed" },
      update: {},
      create: {
        id: "seed-property-agency-managed",
        title: "Commercial Office Space in CBD",
        type: "COMMERCIAL_OFFICE",
        currency: "USD",
        price: 3500,
        areaSqm: 250,
        amenities: ["parking", "security", "elevator", "reception"],
        description: "Prime commercial office space in Harare CBD.",
        status: "PUBLISHED",
        landlordId: demoUser.id,
        ownerId: demoUser.id,
        managedByType: "AGENCY",
        managedById: agency.id,
        agencyId: agency.id,
        assignedAgentId: agentUser.id,
        verificationScore: 95,
        trustScore: 98,
        createdByRole: "LANDLORD",
      },
    });
    console.log(`✔ Seeded property: ${agencyManagedProperty.title}`);

    // Property 4: Pending assignment
    const pendingProperty = await prisma.property.upsert({
      where: { id: "seed-property-pending-assignment" },
      update: {},
      create: {
        id: "seed-property-pending-assignment",
        title: "Townhouse in Highlands",
        type: "TOWNHOUSE",
        currency: "USD",
        price: 1800,
        bedrooms: 4,
        bathrooms: 3,
        areaSqm: 200,
        amenities: ["garden", "garage", "security"],
        description: "Spacious townhouse in serene Highlands area.",
        status: "DRAFT",
        landlordId: demoUser.id,
        ownerId: demoUser.id,
        managedByType: "OWNER",
        createdByRole: "LANDLORD",
      },
    });
    console.log(`✔ Seeded property: ${pendingProperty.title}`);

    // 4. SEED LISTING MANAGEMENT ASSIGNMENTS
    console.log("\n▶ Seeding listing management assignments...");

    // Assignment for agent-managed property (accepted)
    await prisma.listingManagementAssignment.upsert({
      where: { id: "seed-lma-agent-accepted" },
      update: {},
      create: {
        id: "seed-lma-agent-accepted",
        propertyId: agentManagedProperty.id,
        ownerId: demoUser.id,
        managedByType: "AGENT",
        managedById: agentUser.id,
        assignedAgentId: agentUser.id,
        serviceFeeUsdCents: 10000,
        landlordPaysFee: true,
        status: "ACCEPTED",
        createdById: demoUser.id,
        acceptedById: agentUser.id,
        acceptedAt: new Date(),
        notes: "Agent accepted to manage this listing.",
      },
    });
    console.log("✔ Seeded agent management assignment (ACCEPTED)");

    // Assignment for agency-managed property (accepted)
    await prisma.listingManagementAssignment.upsert({
      where: { id: "seed-lma-agency-accepted" },
      update: {},
      create: {
        id: "seed-lma-agency-accepted",
        propertyId: agencyManagedProperty.id,
        ownerId: demoUser.id,
        managedByType: "AGENCY",
        managedById: agency.id,
        assignedAgentId: agentUser.id,
        serviceFeeUsdCents: 25000,
        landlordPaysFee: true,
        status: "ACCEPTED",
        createdById: demoUser.id,
        acceptedById: agentUser.id,
        acceptedAt: new Date(),
        notes: "Agency assigned to manage this commercial property.",
      },
    });
    console.log("✔ Seeded agency management assignment (ACCEPTED)");

    // Assignment pending approval
    await prisma.listingManagementAssignment.upsert({
      where: { id: "seed-lma-pending" },
      update: {},
      create: {
        id: "seed-lma-pending",
        propertyId: pendingProperty.id,
        ownerId: demoUser.id,
        managedByType: "AGENT",
        managedById: agentUser.id,
        assignedAgentId: agentUser.id,
        serviceFeeUsdCents: 15000,
        landlordPaysFee: false,
        status: "CREATED",
        createdById: demoUser.id,
        notes: "Pending agent acceptance for property management.",
      },
    });
    console.log("✔ Seeded pending management assignment (CREATED)");
  } else {
    console.log("⚠ Skipping property seeding - demo user or agent not found");
  }

  console.log("\n🌱 Seed complete.");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("❌ Seed failed:", e);
  process.exit(1);
});

