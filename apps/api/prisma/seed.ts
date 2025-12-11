import { PrismaClient, PropertyStatus, PropertyType, PropertyFurnishing, PropertyAvailability, Currency, Role, MediaKind } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('Start seeding ...');

    const passwordHash = await hash('password123', 10);

    // Ensure we have Zimbabwe as a country
    const country = await prisma.country.upsert({
        where: { iso2: 'ZW' },
        update: {},
        create: {
            iso2: 'ZW',
            name: 'Zimbabwe',
            phoneCode: '+263',
        },
    });

    // Create Harare province
    const province = await prisma.province.upsert({
        where: { countryId_name: { countryId: country.id, name: 'Harare Metropolitan' } },
        update: {},
        create: {
            name: 'Harare Metropolitan',
            countryId: country.id,
        },
    });

    // Create Harare city
    const city = await prisma.city.upsert({
        where: { provinceId_name: { provinceId: province.id, name: 'Harare' } },
        update: {},
        create: {
            name: 'Harare',
            countryId: country.id,
            provinceId: province.id,
            lat: -17.8292,
            lng: 31.0522,
        },
    });

    // Create suburbs
    const borrowdale = await prisma.suburb.upsert({
        where: { cityId_name: { cityId: city.id, name: 'Borrowdale' } },
        update: {},
        create: {
            name: 'Borrowdale',
            countryId: country.id,
            provinceId: province.id,
            cityId: city.id,
            lat: -17.7640,
            lng: 31.0760,
        },
    });

    const avondale = await prisma.suburb.upsert({
        where: { cityId_name: { cityId: city.id, name: 'Avondale' } },
        update: {},
        create: {
            name: 'Avondale',
            countryId: country.id,
            provinceId: province.id,
            cityId: city.id,
            lat: -17.7890,
            lng: 31.0400,
        },
    });

    console.log('Geo data synced:', { country: country.name, city: city.name });

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

    // Delete existing properties for these users to avoid duplicates
    await prisma.property.deleteMany({
        where: {
            OR: [
                { landlordId: landlord.id },
                { agentOwnerId: agent.id }
            ]
        }
    });

    // Create Properties
    const prop1 = await prisma.property.create({
        data: {
            title: 'Modern 4-Bedroom House in Borrowdale',
            description: 'Luxurious family home with golf course views. Features include a modern kitchen, swimming pool, and solar power backup.',
            price: 450000,
            currency: Currency.USD,
            type: PropertyType.HOUSE,
            listingIntent: 'FOR_SALE',
            status: PropertyStatus.VERIFIED,
            landlordId: landlord.id,
            agentOwnerId: agent.id,
            countryId: country.id,
            provinceId: province.id,
            cityId: city.id,
            suburbId: borrowdale.id,
            lat: -17.7640,
            lng: 31.0760,
            bedrooms: 4,
            bathrooms: 3,
            areaSqm: 500,
            furnishing: PropertyFurnishing.FULLY,
            availability: PropertyAvailability.IMMEDIATE,
            amenities: ['Solar backup', 'Borehole', 'Swimming Pool', 'Secure parking'],
            verifiedAt: new Date(),
            media: {
                create: [
                    {
                        url: 'https://images.unsplash.com/photo-1600596542815-2a4d9f0152e3?auto=format&fit=crop&w=800&q=80',
                        kind: MediaKind.IMAGE,
                        hasGps: true,
                        order: 0,
                    },
                    {
                        url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
                        kind: MediaKind.IMAGE,
                        hasGps: false,
                        order: 1,
                    },
                ],
            },
        },
    });

    const prop2 = await prisma.property.create({
        data: {
            title: 'Cozy 2-Bedroom Apartment in Avondale',
            description: 'Secure garden flat close to shopping centers. Ideal for young professionals.',
            price: 1200,
            currency: Currency.USD,
            type: PropertyType.APARTMENT,
            listingIntent: 'TO_RENT',
            status: PropertyStatus.VERIFIED,
            landlordId: landlord.id,
            agentOwnerId: agent.id,
            countryId: country.id,
            provinceId: province.id,
            cityId: city.id,
            suburbId: avondale.id,
            lat: -17.7890,
            lng: 31.0400,
            bedrooms: 2,
            bathrooms: 1,
            areaSqm: 90,
            furnishing: PropertyFurnishing.PARTLY,
            availability: PropertyAvailability.IMMEDIATE,
            amenities: ['Borehole', 'Secure parking', 'Prepaid ZESA'],
            verifiedAt: new Date(),
            media: {
                create: [
                    {
                        url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80',
                        kind: MediaKind.IMAGE,
                        hasGps: false,
                        order: 0,
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
        throw e;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
