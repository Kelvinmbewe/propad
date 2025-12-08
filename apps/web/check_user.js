
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { compare } = require('bcryptjs');

// Load .env manualy
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
                    if (key === 'DATABASE_URL') {
                        const patched = value.replace('postgres:5432', 'localhost:5432');
                        process.env[key] = patched;
                        console.log("Patched URL:", patched);
                        fs.writeFileSync('db_url.txt', patched);
                    } else {
                        process.env[key] = value;
                    }
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

if (process.env.DATABASE_URL) {
    console.log("DATABASE_URL found.");
    // Log host only
    try {
        const url = new URL(process.env.DATABASE_URL);
        console.log("DB Host:", url.hostname);
    } catch (e) {
        console.log("Invalid DB URL format");
    }
} else {
    console.log("DATABASE_URL is MISSING");
}

const prisma = new PrismaClient();

async function checkUser() {
    const email = 'admin@propad.co.zw';
    console.log(`Checking user: ${email}...`);
    try {
        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (user) {
            console.log('User found:', user.email);
            console.log('Role:', user.role);
            console.log('Password hash exists:', !!user.passwordHash);

            if (user.passwordHash) {
                const isValid = await compare('password123', user.passwordHash);
                console.log('Password check for "password123":', isValid);
            }
        } else {
            console.log('User NOT found');
        }
    } catch (e) {
        console.error("Error querying user:", e.name, e.message);
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
