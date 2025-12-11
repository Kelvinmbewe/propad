
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const provinceCount = await prisma.province.count();
        const cityCount = await prisma.city.count();
        const suburbCount = await prisma.suburb.count();

        console.log('--- GEO STATS ---');
        console.log(`Provinces: ${provinceCount}`);
        console.log(`Cities: ${cityCount}`);
        console.log(`Suburbs: ${suburbCount}`);
        console.log('-----------------');

        if (provinceCount > 1 && cityCount > 1) {
            console.log('SUCCESS: Full Geo Data appears to be present.');
        } else {
            console.log('WARNING: Geo Data appears minimal/incomplete.');
        }

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
