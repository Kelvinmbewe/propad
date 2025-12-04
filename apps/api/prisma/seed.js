const { PrismaClient } = require('@prisma/client');
const { hash } = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log('Start seeding ...');

    const passwordHash = await hash('password123', 10);

    // 1. Upsert Users
    const admin = await prisma.user.upsert({
        where: { email: 'admin@propad.co.zw' },
        update: {},
        create: {
            email: 'admin@propad.co.zw',
            name: 'Admin User',
            passwordHash,
            role: 'ADMIN',
            status: 'ACTIVE',
            phone: '+263770000000',
        },
    });

    const agent = await prisma.user.upsert({
        where: { email: 'agent@propad.co.zw' },
        update: {
            agentProfile: {
                upsert: {
                    create: { verifiedListingsCount: 5 },
                    update: { verifiedListingsCount: 5 },
                },
            },
        },
        create: {
            email: 'agent@propad.co.zw',
            name: 'Verified Agent',
            passwordHash,
            role: 'AGENT',
            status: 'ACTIVE',
            phone: '+263771111111',
            agentProfile: {
                create: { verifiedListingsCount: 5 },
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
            role: 'USER',
            status: 'ACTIVE',
            phone: '+263772222222',
        },
    });

    console.log('Users synced:', { admin: admin.email, agent: agent.email, user: user.email });

    // 2. Setup Location Hierarchy
    const country = await prisma.country.upsert({
        where: { iso2: 'ZW' },
        update: {},
        create: {
            iso2: 'ZW',
            name: 'Zimbabwe',
            phoneCode: '+263',
        },
    });

    // Check if province exists, otherwise create (no unique constraint on name alone usually, but assuming simple setup)
    // For simplicity in seed, we'll findFirst or create
    let province = await prisma.province.findFirst({
        where: { countryId: country.id, name: 'Harare' }
    });
    if (!province) {
        province = await prisma.province.create({
            data: { countryId: country.id, name: 'Harare' }
        });
    }

    let city = await prisma.city.findFirst({
        where: { provinceId: province.id, name: 'Harare' }
    });
    if (!city) {
        city = await prisma.city.create({
            data: { countryId: country.id, provinceId: province.id, name: 'Harare' }
        });
    }

    // Suburbs
    const suburbsData = ['Borrowdale Brooke', 'Avondale'];
    const suburbs = {};
    for (const subName of suburbsData) {
        let sub = await prisma.suburb.findFirst({
            where: { cityId: city.id, name: subName }
        });
        if (!sub) {
            sub = await prisma.suburb.create({
                data: {
                    countryId: country.id,
                    provinceId: province.id,
                    cityId: city.id,
                    name: subName
                }
            });
        }
        suburbs[subName] = sub;
    }

    console.log('Locations synced');

    // 3. Properties
    // Delete existing properties for these users to avoid duplicates
    await prisma.property.deleteMany({
        where: {
            OR: [
                { landlordId: user.id },
                { agentOwnerId: agent.id }
            ]
        }
    });

    // Property 1: House in Borrowdale Brooke
    const prop1 = await prisma.property.create({
        data: {
            title: 'Modern 4-Bedroom House in Borrowdale Brooke',
            description: 'Luxurious family home with golf course views. Features include a modern kitchen, swimming pool, and solar power backup.',
            price: 450000,
            currency: 'USD',
            type: 'HOUSE',
            status: 'VERIFIED',
            landlordId: user.id,
            agentOwnerId: agent.id,

            // Location Relations
            countryId: country.id,
            provinceId: province.id,
            cityId: city.id,
            suburbId: suburbs['Borrowdale Brooke'].id,

            // Attributes (Direct fields)
            bedrooms: 4,
            bathrooms: 4, // Int in schema

            // Media
            media: {
                create: [
                    {
                        url: 'https://images.unsplash.com/photo-1600596542815-2a4d9f0152e3?auto=format&fit=crop&w=800&q=80',
                        kind: 'IMAGE',
                        hasGps: false
                    },
                    {
                        url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
                        kind: 'IMAGE',
                        hasGps: false
                    },
                ],
            },
        },
    });

    // Property 2: Apartment in Avondale
    const prop2 = await prisma.property.create({
        data: {
            title: 'Cozy 2-Bedroom Apartment in Avondale',
            description: 'Secure garden flat close to shopping centers. Ideal for young professionals.',
            price: 1200,
            currency: 'USD',
            type: 'APARTMENT',
            status: 'VERIFIED',
            landlordId: user.id,
            agentOwnerId: agent.id,

            // Location Relations
            countryId: country.id,
            provinceId: province.id,
            cityId: city.id,
            suburbId: suburbs['Avondale'].id,

            // Attributes
            bedrooms: 2,
            bathrooms: 1,

            // Media
            media: {
                create: [
                    {
                        url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80',
                        kind: 'IMAGE',
                        hasGps: false
                    },
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
