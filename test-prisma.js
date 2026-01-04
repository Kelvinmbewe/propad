const client = require('@prisma/client');
console.log('Role:', client.Role);
console.log('Role.ADMIN:', client.Role ? client.Role.ADMIN : 'Role is undefined');
console.log('All Role-related keys:', Object.keys(client).filter(k => k.includes('Role') || k === 'Role'));

