const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function test() {
    console.log('Testing full auth flow...');
    console.log('DATABASE_URL:', process.env.DATABASE_URL);

    const prisma = new PrismaClient();

    try {
        const user = await prisma.user.findUnique({
            where: { email: 'admin@propad.co.zw' }
        });

        if (!user) {
            console.log('User not found');
            return;
        }

        console.log('Found user:', user.email, 'Role:', user.role);
        console.log('PasswordHash length:', user.passwordHash?.length);
        console.log('PasswordHash preview:', user.passwordHash?.substring(0, 10) + '...');

        // Test password comparison
        const testPassword = 'password123';
        const isValid = await bcrypt.compare(testPassword, user.passwordHash);
        console.log('Password "password123" valid:', isValid);

        if (isValid) {
            console.log('SUCCESS: User would be authenticated');
        } else {
            console.log('FAILURE: Password comparison failed');
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

test();
