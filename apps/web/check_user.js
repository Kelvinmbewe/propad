
const fs = require('fs');
const path = require('path');

try {
    const envPath = path.resolve(__dirname, '.env');
    if (fs.existsSync(envPath)) {
        const envConfig = fs.readFileSync(envPath, 'utf8');
        envConfig.split('\n').forEach(line => {
            const parts = line.split('=');
            if (parts.length >= 2) {
                const key = parts[0].trim();
                const value = parts.slice(1).join('=').trim().replace(/^"|"$/g, '');
                if (key && value && !key.startsWith('#')) {
                    process.env[key] = value;
                }
            }
        });
        console.log("Loaded .env from", envPath);
    } else {
        console.log(".env not found at", envPath);
    }
} catch (e) {
    console.error("Error loading .env", e);
}

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUser() {
    const user = await prisma.user.findUnique({
        where: { email: 'admin@propad.co.zw' },
    });
    console.log('User found:', user);
    if (user) {
        console.log('Password hash:', user.passwordHash); // Just to check if it exists, not logging the actual hash would be better safety practice but here we need to know if it's null
    }
}

checkUser()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
