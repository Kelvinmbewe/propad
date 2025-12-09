const { PrismaClient } = require('@prisma/client');

async function test() {
    console.log('Testing Prisma DB connection...');
    console.log('DATABASE_URL:', process.env.DATABASE_URL);

    const prisma = new PrismaClient();

    try {
        const user = await prisma.user.findFirst({
            where: { email: 'admin@propad.co.zw' }
        });

        if (user) {
            console.log('Found user:', user.email, 'Role:', user.role);
            console.log('Has passwordHash:', !!user.passwordHash);
        } else {
            console.log('User not found');
        }
    } catch (error) {
        console.error('Prisma error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

test();
