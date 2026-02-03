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

    await prisma.user.upsert({
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

    console.log(`✔ Upserted ${u.email}`);
  }

  console.log("🌱 Seed complete.");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("❌ Seed failed:", e);
  process.exit(1);
});
