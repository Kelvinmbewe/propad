const { PrismaClient, Role, AgencyStatus, AgencyMemberRole } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log('Start custom seeding...');

    const adminPassword = await bcrypt.hash('Admin123!', 10);
    const verifierPassword = await bcrypt.hash('Verifier123!', 10);
    const agentPassword = await bcrypt.hash('Agent123!', 10);
    const userPassword = await bcrypt.hash('User123!', 10);

    // Admin
    await prisma.user.upsert({
        where: { email: 'admin@propad.local' },
        update: { passwordHash: adminPassword, role: 'ADMIN', isVerified: true, trustScore: 100, verificationScore: 100 },
        create: { email: 'admin@propad.local', name: 'Super Admin', passwordHash: adminPassword, role: 'ADMIN', status: 'ACTIVE', phone: '+263770000000', isVerified: true, kycStatus: 'VERIFIED', trustScore: 100, verificationScore: 100, bio: 'System Administrator' }
    });
    console.log('Seeded Admin');

    // Verifier
    await prisma.user.upsert({
        where: { email: 'verifier@propad.local' },
        update: { passwordHash: verifierPassword, role: 'VERIFIER' },
        create: { email: 'verifier@propad.local', name: 'Trusted Verifier', passwordHash: verifierPassword, role: 'VERIFIER', status: 'ACTIVE', phone: '+263770000002', trustScore: 80 }
    });
    console.log('Seeded Verifier');

    // Agent
    const agent = await prisma.user.upsert({
        where: { email: 'agent@propad.local' },
        update: { passwordHash: agentPassword, role: 'AGENT' },
        create: { email: 'agent@propad.local', name: 'Verified Agent', passwordHash: agentPassword, role: 'AGENT', status: 'ACTIVE', phone: '+263771111111', isVerified: true, kycStatus: 'VERIFIED', trustScore: 90, verificationScore: 90, agentProfile: { create: { kycStatus: 'VERIFIED', verifiedListingsCount: 10, rating: 4.8, bio: 'Top performing agent' } } }
    });

    // Ensure agent profile
    await prisma.agentProfile.upsert({
        where: { userId: agent.id },
        update: {},
        create: { userId: agent.id, kycStatus: 'VERIFIED', verifiedListingsCount: 10, rating: 4.8, bio: 'Top performing agent' }
    });
    console.log('Seeded Agent');

    // User
    await prisma.user.upsert({
        where: { email: 'user@propad.local' },
        update: { passwordHash: userPassword, role: 'USER' },
        create: { email: 'user@propad.local', name: 'Standard User', passwordHash: userPassword, role: 'USER', status: 'ACTIVE', phone: '+263772222222' }
    });
    console.log('Seeded User');

    console.log('Seeding finished.');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
