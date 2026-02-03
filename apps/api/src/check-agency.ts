
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const id = 'cmktnqbeq0004ih7ljnciurh1';
    console.log(`Checking agency ${id}...`);
    try {
        const agency = await prisma.agency.findUnique({
            where: { id },
            include: {
                reviews: {
                    take: 5,
                    orderBy: { createdAt: "desc" },
                    include: { reviewer: { select: { name: true } } },
                },
                members: {
                    include: {
                        user: { select: { id: true, name: true, profilePhoto: true } },
                    },
                },
            },
        });
        console.log('Agency found:', agency ? 'YES' : 'NO');
        if (agency) {
            console.log('Agency data:', JSON.stringify(agency, null, 2));
        }
    } catch (e) {
        console.error('Error fetching agency:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
