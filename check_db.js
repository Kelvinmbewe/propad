const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient({
    datasources: {
        db: { url: 'postgresql://kelvin:Kellzbiax95@localhost:5432/propad?schema=public' }
    }
});

async function main() {
    try {
        const props = await p.$queryRawUnsafe('SELECT count(*)::int as cnt FROM "Property" WHERE status=\'PUBLISHED\'');
        console.log('Published properties:', props[0].cnt);
        const users = await p.$queryRawUnsafe('SELECT count(*)::int as cnt FROM "User"');
        console.log('Users:', users[0].cnt);
        const cities = await p.$queryRawUnsafe('SELECT count(*)::int as cnt FROM "City"');
        console.log('Cities:', cities[0].cnt);
        const suburbs = await p.$queryRawUnsafe('SELECT count(*)::int as cnt FROM "Suburb"');
        console.log('Suburbs:', suburbs[0].cnt);
    } catch (e) {
        console.error('DB Error:', e.message);
    } finally {
        await p.$disconnect();
    }
}

main();
