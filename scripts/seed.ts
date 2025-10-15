import { PrismaClient, Role } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

const users: Array<{ email: string; role: Role }> = [
  { email: 'admin@propad.co.zw', role: 'ADMIN' },
  { email: 'verifier@propad.co.zw', role: 'VERIFIER' },
  { email: 'agent@propad.co.zw', role: 'AGENT' },
  { email: 'landlord@propad.co.zw', role: 'LANDLORD' }
];

async function main() {
  const passwordHash = await hash('PropAd123!', 10);

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: { role: user.role },
      create: {
        email: user.email,
        role: user.role,
        passwordHash
      }
    });
  }

  await prisma.rewardPool.upsert({
    where: { id: 'seed-pool' },
    update: { balanceUsd: 5000 },
    create: { id: 'seed-pool', balanceUsd: 5000 }
  });

  console.log('Seed completed');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
