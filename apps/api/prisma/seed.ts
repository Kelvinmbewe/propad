import { PrismaClient, PropertyStatus, PropertyType, PropertyFurnishing, PropertyAvailability, Currency, Role, MediaKind } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('Start seeding ...');

    const passwordHash = await hash('password123', 10);

    // Upsert Users only - geo data is handled by GeoService.ensureSeedData() on app startup
    const admin = await prisma.user.upsert({
        where: { email: 'admin@propad.co.zw' },
        update: {},
        create: {
            email: 'admin@propad.co.zw',
            name: 'Admin User',
            passwordHash,
            role: Role.ADMIN,
            status: 'ACTIVE',
            phone: '+263770000000',
        },
    });

    const agent = await prisma.user.upsert({
        where: { email: 'agent@propad.co.zw' },
        update: {
            agentProfile: {
                upsert: {
                    create: {
                        kycStatus: 'VERIFIED',
                        verifiedListingsCount: 5,
                    },
                    update: {
                        kycStatus: 'VERIFIED',
                    },
                },
            },
        },
        create: {
            email: 'agent@propad.co.zw',
            name: 'Verified Agent',
            passwordHash,
            role: Role.AGENT,
            status: 'ACTIVE',
            phone: '+263771111111',
            agentProfile: {
                create: {
                    kycStatus: 'VERIFIED',
                    verifiedListingsCount: 5,
                },
            },
        },
    });

    const user = await prisma.user.upsert({
        where: { email: 'user@propad.co.zw' },
        update: {},
        create: {
            email: 'user@propad.co.zw',
            name: 'Standard User',
            passwordHash,
            role: Role.USER,
            status: 'ACTIVE',
            phone: '+263772222222',
        },
    });

    const landlord = await prisma.user.upsert({
        where: { email: 'landlord@propad.co.zw' },
        update: {},
        create: {
            email: 'landlord@propad.co.zw',
            name: 'Property Owner',
            passwordHash,
            role: Role.LANDLORD,
            status: 'ACTIVE',
            phone: '+263773333333',
        },
    });

    console.log('Users synced:', { admin: admin.email, agent: agent.email, user: user.email, landlord: landlord.email });

    // NOTE: Geo data (countries, provinces, cities, suburbs) is seeded by GeoService.ensureSeedData()
    // when the API starts up. This keeps the comprehensive location data in one place.
    // See: apps/api/src/geo/suburbs.data.ts for the full Zimbabwe location data.

    console.log('Seeding finished.');
    console.log('NOTE: Geo data will be seeded when the API starts (via GeoService.ensureSeedData())');
}

main()
    .catch((e) => {
        console.error(e);
        throw e;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
