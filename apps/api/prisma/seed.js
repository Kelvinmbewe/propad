const { PrismaClient, PropertyStatus, PropertyType, Role } = require('@prisma/client');
const { hash } = require('bcryptjs');

const PowerPhase = {
    SINGLE: 'SINGLE',
    THREE: 'THREE',
};

const prisma = new PrismaClient();

async function main() {
    console.log('Start seeding ...');

    const passwordHash = await hash('password123', 10);

    // Upsert Users
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
                        licenseNumber: 'AG-12345',
                        verificationStatus: 'VERIFIED',
                        verifiedListingsCount: 5,
                    },
                    update: {
                        licenseNumber: 'AG-12345',
                        verificationStatus: 'VERIFIED',
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
                    licenseNumber: 'AG-12345',
                    verificationStatus: 'VERIFIED',
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

    console.log('Users synced:', { admin: admin.email, agent: agent.email, user: user.email });

    // Delete existing properties for these users to avoid duplicates
    await prisma.property.deleteMany({
        where: {
            OR: [
                { landlordId: user.id },
                { agentOwnerId: agent.id }
            ]
        }
    });

    const prop1 = await prisma.property.create({
        data: {
            title: 'Modern 4-Bedroom House in Borrowdale Brooke',
            description: 'Luxurious family home with golf course views. Features include a modern kitchen, swimming pool, and solar power backup.',
            price: 450000,
            currency: 'USD',
            type: PropertyType.RESIDENTIAL_SALE,
            status: PropertyStatus.PUBLISHED,
            landlordId: user.id,
            agentOwnerId: agent.id,
            location: {
                create: {
                    address: '123 Golf Course Way',
                    city: { create: { name: 'Harare' } },
                    suburb: { create: { name: 'Borrowdale Brooke' } },
                    country: { create: { name: 'Zimbabwe' } },
                    coordinates: { lat: -17.75, lng: 31.13 },
                },
            },
            attributes: {
                create: {
                    bedrooms: 4,
                    bathrooms: 3.5,
                    areaSqM: 500,
                    parkingSpaces: 2,
                    hasBorehole: true,
                    hasSolarPower: true,
                    powerPhase: PowerPhase.THREE,
                },
            },
            images: {
                create: [
                    { url: 'https://images.unsplash.com/photo-1600596542815-2a4d9f0152e3?auto=format&fit=crop&w=800&q=80', caption: 'Exterior' },
                    { url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80', caption: 'Living Room' },
                ],
            },
        },
    });

    const prop2 = await prisma.property.create({
        data: {
            title: 'Cozy 2-Bedroom Apartment in Avondale',
            description: 'Secure garden flat close to shopping centers. Ideal for young professionals.',
            price: 1200,
            currency: 'USD',
            type: PropertyType.RESIDENTIAL_RENTAL,
            status: PropertyStatus.PUBLISHED,
            landlordId: user.id,
            agentOwnerId: agent.id,
            location: {
                create: {
                    address: '45 King George Road',
                    city: { connect: { name: 'Harare' } },
                    suburb: { create: { name: 'Avondale' } },
                    country: { connect: { name: 'Zimbabwe' } },
                    coordinates: { lat: -17.80, lng: 31.04 },
                },
            },
            attributes: {
                create: {
                    bedrooms: 2,
                    bathrooms: 1,
                    areaSqM: 90,
                    parkingSpaces: 1,
                    hasBorehole: true,
                },
            },
            images: {
                create: [
                    { url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80', caption: 'Interior' },
                ],
            },
        },
    });

    console.log('Created properties:', { prop1: prop1.title, prop2: prop2.title });

    console.log('Seeding finished.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
