const prisma = require('@prisma/client');
console.log('Prisma Client Exports:', Object.keys(prisma));
if (prisma.PropertyType) {
    console.log('PropertyType:', prisma.PropertyType);
} else {
    console.log('PropertyType is undefined');
}
