const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const email = 'demo.user@propad.co.zw';
    const password = 'PropAd123!';
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log(`Creating user ${email}...`);

    try {
        const user = await prisma.user.upsert({
            where: { email },
            update: {
                passwordHash: hashedPassword,
                trustTier: 'NORMAL'
            },
            create: {
                email,
                passwordHash: hashedPassword,
                name: 'Demo User',
                role: 'USER',
                trustTier: 'NORMAL'
            },
        });
        console.log('User created/updated:', user.id);
    } catch (err) {
        console.error('Error creating user:', err);
        process.exit(1);
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
