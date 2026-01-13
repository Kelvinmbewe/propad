const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/**
 * Canonical seed entrypoint.
 * - Must be idempotent
 * - Safe to run in dev/demo
 * - Extend by importing module-specific seeders
 */
async function main() {
  console.log("▶ Running Propad seed...");

  // Example placeholder (replace with real logic):
  // await prisma.user.upsert({
  //   where: { email: "admin@propad.local" },
  //   update: {},
  //   create: {
  //     email: "admin@propad.local",
  //     name: "Admin"
  //   }
  // });

  console.log("✔ Seed complete (no-op baseline)");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
