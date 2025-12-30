const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const email = 'demo.user@propad.co.zw';
    console.log('Using DB URL:', process.env.DATABASE_URL);
    try {
        const user = await prisma.user.findUnique({
            where: { email },
            select: { profilePhoto: true, trustTier: true, trustScore: true, email: true }
        });
        console.log('User fetch success:', user);
    } catch (err) {
        console.error('Error fetching user:', err);
        process.exit(1);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
