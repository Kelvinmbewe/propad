import { PrismaClient, PropertyStatus, PropertyType } from '@prisma/client';

enum PowerPhase {
    SINGLE = 'SINGLE',
    THREE = 'THREE',
}

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding database...');

    // Create a demo user
    const demoUser = await prisma.user.upsert({
        where: { email: 'demo@propad.co.zw' },
        update: {},
        create: {
            email: 'demo@propad.co.zw',
            name: 'Demo User',
            role: 'USER'
        }
    });

    // Create a demo agent
    const demoAgent = await prisma.user.upsert({
        where: { email: 'agent@propad.co.zw' },
        update: {},
        create: {
            email: 'agent@propad.co.zw',
            name: 'Tinashe Moyo',
            role: 'AGENT'
        }
    });

    // Seed Properties
    const properties = [
        {
            title: 'Vantage Towers · Borrowdale',
            description: 'Experience the pinnacle of luxury living in the heart of Borrowdale. This penthouse offers panoramic views of the Harare skyline, bespoke finishes, and exclusive access to the rooftop infinity pool.',
            price: 420000,
            currency: 'USD',
            status: PropertyStatus.VERIFIED,
            type: PropertyType.RESIDENTIAL,
            beds: 4,
            baths: 3,
            area: 365,
            address: '12 Borrowdale Road',
            city: 'Harare',
            suburb: 'Borrowdale',
            country: 'Zimbabwe',
            lat: -17.7605,
            lng: 31.0944,
            images: ['https://images.unsplash.com/photo-1515263487990-61b07816b324?auto=format&fit=crop&w=1200&q=80'],
            agentId: demoAgent.id,
            powerPhase: PowerPhase.GOOD
        },
        {
            title: 'Umwinsidale Manor',
            description: 'A sprawling estate nestled in the tranquil hills of Umwinsidale. Featuring a main residence, guest cottage, equestrian facilities, and indigenous gardens. Perfect for the discerning family.',
            price: 3400,
            currency: 'USD',
            status: PropertyStatus.VERIFIED,
            type: PropertyType.RESIDENTIAL,
            beds: 6,
            baths: 5,
            area: 480,
            address: '45 Umwinsidale Drive',
            city: 'Harare',
            suburb: 'Umwinsidale',
            country: 'Zimbabwe',
            lat: -17.7376,
            lng: 31.135,
            images: ['https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=80'],
            agentId: demoAgent.id,
            powerPhase: PowerPhase.GOOD
        },
        {
            title: 'Tranquil Mews · Avondale',
            description: 'Modern townhouse living in the vibrant suburb of Avondale. Walking distance to shopping centers and cafes. Secure complex with borehole water and solar backup.',
            price: 1050,
            currency: 'USD',
            status: PropertyStatus.VERIFIED,
            type: PropertyType.RESIDENTIAL,
            beds: 3,
            baths: 2,
            area: 210,
            address: '8 King George Road',
            city: 'Harare',
            suburb: 'Avondale',
            country: 'Zimbabwe',
            lat: -17.7894,
            lng: 31.0463,
            images: ['https://images.unsplash.com/photo-1520256862855-398228c41684?auto=format&fit=crop&w=1200&q=80'],
            agentId: demoAgent.id,
            powerPhase: PowerPhase.GOOD
        },
        {
            title: 'Highlands Heritage Home',
            description: 'A beautifully preserved colonial home in Highlands. Pressed ceilings, wooden floors, and a wrap-around veranda. Set on an acre of lush garden with a swimming pool.',
            price: 280000,
            currency: 'USD',
            status: PropertyStatus.VERIFIED,
            type: PropertyType.RESIDENTIAL,
            beds: 4,
            baths: 3,
            area: 320,
            address: '22 Ridgeway North',
            city: 'Harare',
            suburb: 'Highlands',
            country: 'Zimbabwe',
            lat: -17.8056,
            lng: 31.0876,
            images: ['https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80'],
            agentId: demoAgent.id,
            powerPhase: PowerPhase.GOOD
        },
        {
            title: 'Msasa Industrial Park',
            description: 'Prime industrial warehousing in Msasa. High clearance, 3-phase power, and excellent road frontage. Ideal for logistics or manufacturing.',
            price: 5500,
            currency: 'USD',
            status: PropertyStatus.VERIFIED,
            type: PropertyType.COMMERCIAL,
            beds: 0,
            baths: 2,
            area: 1200,
            address: '100 Mutare Road',
            city: 'Harare',
            suburb: 'Msasa',
            country: 'Zimbabwe',
            lat: -17.8421,
            lng: 31.1098,
            images: ['https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80'],
            agentId: demoAgent.id,
            powerPhase: PowerPhase.GOOD
        },
        {
            title: 'Bulawayo CBD Office Space',
            description: 'Modern office suite in the heart of Bulawayo CBD. Open plan layout, air conditioning, and secure parking. Ready for immediate occupation.',
            price: 800,
            currency: 'USD',
            status: PropertyStatus.VERIFIED,
            type: PropertyType.COMMERCIAL,
            beds: 0,
            baths: 1,
            area: 150,
            address: '9th Avenue / Main Street',
            city: 'Bulawayo',
            suburb: 'CBD',
            country: 'Zimbabwe',
            lat: -20.1560,
            lng: 28.5800,
            images: ['https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80'],
            agentId: demoAgent.id,
            powerPhase: PowerPhase.GOOD
        }
    ];

    for (const prop of properties) {
        const { city, suburb, country, address, lat, lng, images, ...data } = prop;

        // Upsert location data (simplified for seeding)
        const countryRec = await prisma.country.upsert({
            where: { code: 'ZW' },
            update: {},
            create: { name: 'Zimbabwe', code: 'ZW' }
        });

        const cityRec = await prisma.city.upsert({
            where: { name_countryId: { name: city, countryId: countryRec.id } },
            update: {},
            create: { name: city, countryId: countryRec.id }
        });

        const suburbRec = await prisma.suburb.upsert({
            where: { name_cityId: { name: suburb, cityId: cityRec.id } },
            update: {},
            create: { name: suburb, cityId: cityRec.id }
        });

        await prisma.property.create({
            data: {
                ...data,
                address,
                lat,
                lng,
                countryId: countryRec.id,
                cityId: cityRec.id,
                suburbId: suburbRec.id,
                agentOwnerId: data.agentId,
                media: {
                    create: images.map(url => ({
                        url,
                        type: 'IMAGE',
                        mimeType: 'image/jpeg'
                    }))
                }
            }
        });
    }

    console.log('Seeding completed.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
