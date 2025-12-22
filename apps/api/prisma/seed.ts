import { PrismaClient, Role, AgencyStatus, AgencyMemberRole } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('Start seeding ...');

    const passwordHash = await hash('password123', 10);

    // 1. SUPER ADMIN
    const admin = await prisma.user.upsert({
        where: { email: 'admin@propad.co.zw' },
        update: {
            role: Role.ADMIN,
            isVerified: true,
            trustScore: 100,
            verificationScore: 100,
        },
        create: {
            email: 'admin@propad.co.zw',
            name: 'Super Admin',
            passwordHash,
            role: Role.ADMIN,
            status: 'ACTIVE',
            phone: '+263770000000',
            isVerified: true,
            kycStatus: 'VERIFIED',
            trustScore: 100,
            verificationScore: 100,
            bio: 'System Administrator',
        },
    });
    console.log('Seeded Admin:', admin.email);

    // 2. MODERATOR
    const moderator = await prisma.user.upsert({
        where: { email: 'moderator@propad.co.zw' },
        update: {
            role: Role.MODERATOR,
        },
        create: {
            email: 'moderator@propad.co.zw',
            name: 'Site Moderator',
            passwordHash,
            role: Role.MODERATOR,
            status: 'ACTIVE',
            phone: '+263770000001',
            bio: 'Regional Moderator for Harare',
            location: 'Harare',
        },
    });
    console.log('Seeded Moderator:', moderator.email);

    // 3. VERIFIER
    const verifier = await prisma.user.upsert({
        where: { email: 'verifier@propad.co.zw' },
        update: {
            role: Role.VERIFIER,
        },
        create: {
            email: 'verifier@propad.co.zw',
            name: 'Trusted Verifier',
            passwordHash,
            role: Role.VERIFIER,
            status: 'ACTIVE',
            phone: '+263770000002',
            trustScore: 80,
        },
    });
    console.log('Seeded Verifier:', verifier.email);

    // 4. AGENT (Independent / Company Linked)
    const agent = await prisma.user.upsert({
        where: { email: 'agent@propad.co.zw' },
        update: {
            role: Role.AGENT,
        },
        create: {
            email: 'agent@propad.co.zw',
            name: 'Verified Agent',
            passwordHash,
            role: Role.AGENT,
            status: 'ACTIVE',
            phone: '+263771111111',
            isVerified: true,
            kycStatus: 'VERIFIED',
            trustScore: 90,
            verificationScore: 90,
            agentProfile: {
                create: {
                    kycStatus: 'VERIFIED',
                    verifiedListingsCount: 10,
                    rating: 4.8,
                    bio: 'Top performing agent in the region',
                },
            },
        },
    });

    // Ensure Agent Profile exists if user was updated but profile missing
    const agentProfile = await prisma.agentProfile.upsert({
        where: { userId: agent.id },
        update: {},
        create: {
            userId: agent.id,
            kycStatus: 'VERIFIED',
            verifiedListingsCount: 10,
            rating: 4.8,
            bio: 'Top performing agent in the region',
        }
    });

    console.log('Seeded Agent:', agent.email);

    // 5. LANDLORD
    const landlord = await prisma.user.upsert({
        where: { email: 'landlord@propad.co.zw' },
        update: {
            role: Role.LANDLORD,
        },
        create: {
            email: 'landlord@propad.co.zw',
            name: 'Property Owner',
            passwordHash,
            role: Role.LANDLORD,
            status: 'ACTIVE',
            phone: '+263773333333',
            kycStatus: 'VERIFIED',
            landlordProfile: {
                create: {
                    verifiedAt: new Date(),
                },
            },
        },
    });

    // Ensure Landlord Profile exists
    await prisma.landlordProfile.upsert({
        where: { userId: landlord.id },
        update: {},
        create: {
            userId: landlord.id,
            verifiedAt: new Date(),
        }
    });

    console.log('Seeded Landlord:', landlord.email);

    // 6. STANDARD USER
    const user = await prisma.user.upsert({
        where: { email: 'user@propad.co.zw' },
        update: {
            role: Role.USER,
        },
        create: {
            email: 'user@propad.co.zw',
            name: 'Standard User',
            passwordHash,
            role: Role.USER,
            status: 'ACTIVE',
            phone: '+263772222222',
        },
    });
    console.log('Seeded User:', user.email);

    // 7. REAL ESTATE COMPANY (AGENCY)
    const agency = await prisma.agency.upsert({
        where: { slug: 'prestige-properties' },
        update: {},
        create: {
            name: 'Prestige Properties',
            slug: 'prestige-properties',
            email: 'info@prestigeprop.co.zw',
            phone: '+263242000000',
            address: '123 Samora Machel Ave, Harare',
            status: AgencyStatus.ACTIVE,
            trustScore: 95,
            verificationScore: 95,
            verifiedAt: new Date(),
            bio: 'Zimbabwe’s leading luxury property specialists.',
        }
    });
    console.log('Seeded Agency:', agency.name);

    // 8. LINK AGENT TO AGENCY
    await prisma.agencyMember.upsert({
        where: {
            agencyId_userId: {
                agencyId: agency.id,
                userId: agent.id
            }
        },
        update: {},
        create: {
            agencyId: agency.id,
            userId: agent.id,
            role: AgencyMemberRole.AGENT,
            isActive: true,
        }
    });
    console.log('Linked Agent to Agency');

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
