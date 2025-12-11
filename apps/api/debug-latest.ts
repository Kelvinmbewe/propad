
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const property = await prisma.property.findFirst({
            orderBy: { createdAt: 'desc' },
            include: {
                landlord: true,
                suburb: true,
                city: true
            }
        });

        if (!property) {
            console.log('No properties found in database.');
            return;
        }

        console.log('LATEST PROPERTY DEBUG INFO:');
        console.log('---------------------------');
        console.log(`ID: ${property.id}`);
        console.log(`Title: ${property.title}`);
        console.log(`Created At: ${property.createdAt}`);
        console.log(`Landlord ID: ${property.landlordId}`);
        console.log(`Landlord Email: ${property.landlord?.email || 'N/A'}`);
        console.log(`Owner Agent ID: ${property.agentOwnerId}`);
        console.log(`Location: ${property.suburb?.name}, ${property.city?.name}`);
        console.log('---------------------------');

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
