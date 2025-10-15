import {
  Currency,
  LeadSource,
  LeadStatus,
  MediaKind,
  PolicyStrikeReason,
  PayoutMethod,
  PayoutStatus,
  Prisma,
  PrismaClient,
  PromoTier,
  PropertyStatus,
  PropertyType,
  RewardEventType,
  Role,
  VerificationMethod,
  VerificationResult
} from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

const HARARE_SUBURBS = [
  'Avondale',
  'Borrowdale',
  'Greendale',
  'Mabelreign',
  'Mt Pleasant',
  'Highlands',
  'Belvedere',
  'Budiriro',
  'Marlborough',
  'Westgate'
];

async function upsertUser({
  email,
  role,
  name,
  phone,
  passwordHash
}: {
  email: string;
  role: Role;
  name: string;
  phone: string;
  passwordHash: string;
}) {
  return prisma.user.upsert({
    where: { email },
    update: { role, name, phone },
    create: {
      email,
      role,
      name,
      phone,
      passwordHash,
      status: 'ACTIVE'
    }
  });
}

async function main() {
  const adminPasswordHash = await hash('Admin@123', 10);
  const defaultPasswordHash = await hash('PropAd123!', 10);

  const admin = await upsertUser({
    email: 'admin@propad.co.zw',
    role: Role.ADMIN,
    name: 'Propad Administrator',
    phone: '+263777000001',
    passwordHash: adminPasswordHash
  });

  const verifierUsers = await Promise.all(
    Array.from({ length: 3 }).map((_, index) =>
      upsertUser({
        email: `verifier${index + 1}@propad.co.zw`,
        role: Role.VERIFIER,
        name: `Quality Verifier ${index + 1}`,
        phone: `+2637780000${(index + 1).toString().padStart(2, '0')}`,
        passwordHash: defaultPasswordHash
      })
    )
  );

  const agentUsers = await Promise.all(
    Array.from({ length: 30 }).map((_, index) =>
      upsertUser({
        email: `agent${index + 1}@propad.co.zw`,
        role: Role.AGENT,
        name: `Harare Agent ${index + 1}`,
        phone: `+26377100${(index + 1).toString().padStart(3, '0')}`,
        passwordHash: defaultPasswordHash
      })
    )
  );

  await Promise.all(
    agentUsers.map((agent, index) =>
      prisma.agentProfile.upsert({
        where: { userId: agent.id },
        update: {
          bio: `Experienced property agent serving ${HARARE_SUBURBS[index % HARARE_SUBURBS.length]}.`,
          rating: 4 + (index % 5) * 0.1,
          verifiedListingsCount: (index % 7) + 3,
          leadsCount: (index % 11) * 3 + 5,
          strikesCount: index % 4 === 0 ? 1 : 0,
          kycStatus: 'VERIFIED'
        },
        create: {
          userId: agent.id,
          bio: `Experienced property agent serving ${HARARE_SUBURBS[index % HARARE_SUBURBS.length]}.`,
          rating: 4 + (index % 5) * 0.1,
          verifiedListingsCount: (index % 7) + 3,
          leadsCount: (index % 11) * 3 + 5,
          strikesCount: index % 4 === 0 ? 1 : 0,
          kycStatus: 'VERIFIED'
        }
      })
    )
  );

  const landlordUsers = await Promise.all(
    Array.from({ length: 10 }).map((_, index) =>
      upsertUser({
        email: `landlord${index + 1}@propad.co.zw`,
        role: Role.LANDLORD,
        name: `Landlord ${index + 1}`,
        phone: `+26377220${(index + 1).toString().padStart(3, '0')}`,
        passwordHash: defaultPasswordHash
      })
    )
  );

  await Promise.all(
    landlordUsers.map((landlord, index) =>
      prisma.landlordProfile.upsert({
        where: { userId: landlord.id },
        update: {
          companyName: `Prop Holdings ${index + 1}`,
          verifiedAt: new Date(Date.now() - index * 86400000)
        },
        create: {
          userId: landlord.id,
          companyName: `Prop Holdings ${index + 1}`,
          verifiedAt: new Date(Date.now() - index * 86400000)
        }
      })
    )
  );

  const consumerUsers = await Promise.all(
    Array.from({ length: 20 }).map((_, index) =>
      upsertUser({
        email: `user${index + 1}@propad.co.zw`,
        role: Role.USER,
        name: `Home Seeker ${index + 1}`,
        phone: `+26377330${(index + 1).toString().padStart(3, '0')}`,
        passwordHash: defaultPasswordHash
      })
    )
  );

  const propertyTypes: PropertyType[] = [
    PropertyType.HOUSE,
    PropertyType.COTTAGE,
    PropertyType.ROOM,
    PropertyType.PLOT,
    PropertyType.SALE
  ];
  const propertyStatuses: PropertyStatus[] = [
    PropertyStatus.VERIFIED,
    PropertyStatus.PENDING_VERIFY,
    PropertyStatus.DRAFT,
    PropertyStatus.PENDING_VERIFY,
    PropertyStatus.VERIFIED
  ];

  const properties = [] as Array<{ id: string }>;
  for (let index = 0; index < 50; index++) {
    const agent = agentUsers[index % agentUsers.length];
    const landlord = landlordUsers[index % landlordUsers.length];
    const suburb = HARARE_SUBURBS[index % HARARE_SUBURBS.length];
    const type = propertyTypes[index % propertyTypes.length];
    const status = propertyStatuses[index % propertyStatuses.length];
    const currency = index % 4 === 0 ? Currency.ZWG : Currency.USD;
    const isSaleListing = type === PropertyType.SALE || (index % 6 === 0 && type !== PropertyType.ROOM);
    const priceBase = isSaleListing ? 45000 + index * 2500 : 250 + index * 12;
    const property = await prisma.property.create({
      data: {
        landlordId: landlord.id,
        agentOwnerId: agent.id,
        type,
        currency,
        price: new Prisma.Decimal(priceBase.toFixed(2)),
        city: 'Harare',
        suburb,
        latitude: -17.8292 + index * 0.001,
        longitude: 31.0522 + index * 0.001,
        bedrooms: type === PropertyType.ROOM ? 1 : 3 + (index % 4),
        bathrooms: type === PropertyType.ROOM ? 1 : 2 + (index % 3),
        amenities: ['WiFi', index % 2 === 0 ? 'Parking' : 'Borehole', 'Security'],
        description: `${type} in ${suburb} with modern finishes and close to amenities.`,
        status,
        verifiedAt: status === PropertyStatus.VERIFIED ? new Date(Date.now() - index * 43200000) : null,
        media: {
          create: [
            {
              url: `https://cdn.propad.co.zw/properties/${index + 1}/cover.jpg`,
              kind: MediaKind.IMAGE,
              hasGps: true,
              shotAt: new Date(Date.now() - index * 86400000)
            }
          ]
        },
        verifications:
          status === PropertyStatus.VERIFIED
            ? {
                create: {
                  verifierId: verifierUsers[index % verifierUsers.length].id,
                  method: VerificationMethod.SITE,
                  result: VerificationResult.PASS,
                  notes: 'Routine site visit verification with supporting documents.'
                }
              }
            : undefined
      }
    });
    properties.push(property);
  }

  const leadSources = [LeadSource.WEB, LeadSource.WHATSAPP, LeadSource.FACEBOOK];
  const leadStatuses = [LeadStatus.NEW, LeadStatus.CONTACTED, LeadStatus.QUALIFIED, LeadStatus.CLOSED];
  for (let index = 0; index < 100; index++) {
    const property = properties[index % properties.length];
    const source = leadSources[index % leadSources.length];
    const status = leadStatuses[index % leadStatuses.length];
    await prisma.lead.create({
      data: {
        propertyId: property.id,
        userId: index % 2 === 0 ? consumerUsers[index % consumerUsers.length].id : null,
        source,
        channelRef:
          source === LeadSource.WHATSAPP
            ? 'WA_CAMPAIGN'
            : source === LeadSource.FACEBOOK
              ? 'FB_ADS'
              : 'WEB_FORM',
        contactPhone: `+2637800${(100 + index).toString().padStart(3, '0')}`,
        status,
        createdAt: new Date(Date.now() - index * 3600000)
      }
    });
  }

  const rewardEventTypes = [
    RewardEventType.LISTING_VERIFIED,
    RewardEventType.LEAD_VALID,
    RewardEventType.SALE_CONFIRMED,
    RewardEventType.BONUS_TIER,
    RewardEventType.PROMO_REBATE
  ];

  for (let index = 0; index < agentUsers.length; index++) {
    if (index >= 12) {
      break;
    }

    await prisma.rewardEvent.create({
      data: {
        agentId: agentUsers[index].id,
        type: rewardEventTypes[index % rewardEventTypes.length],
        points: 50 + index * 5,
        usdCents: 2000 + index * 150,
        refId: properties[index]?.id
      }
    });
  }

  const payoutStatuses: PayoutStatus[] = [PayoutStatus.PENDING, PayoutStatus.PAID];
  for (let index = 0; index < 6; index++) {
    await prisma.payout.create({
      data: {
        agentId: agentUsers[index].id,
        amountUsdCents: 5000 + index * 1000,
        method: index % 2 === 0 ? PayoutMethod.ECOCASH : PayoutMethod.BANK,
        status: payoutStatuses[index % payoutStatuses.length],
        txRef: index % 2 === 0 ? null : `TX-${1000 + index}`
      }
    });
  }

  const strikeReasons = [
    PolicyStrikeReason.VIEWING_FEE,
    PolicyStrikeReason.SCAM,
    PolicyStrikeReason.MISREPRESENTATION
  ];
  for (let index = 0; index < strikeReasons.length; index++) {
    await prisma.policyStrike.create({
      data: {
        agentId: agentUsers[index + 5].id,
        reason: strikeReasons[index],
        severity: 1 + index,
        resolved: index % 2 === 0,
        createdAt: new Date(Date.now() - index * 7200000)
      }
    });
  }

  const now = new Date();
  const promoConfigurations: Array<{ agentIndex: number; propertyIndex: number; tier: PromoTier }> = [
    { agentIndex: 0, propertyIndex: 1, tier: PromoTier.PLUS },
    { agentIndex: 2, propertyIndex: 5, tier: PromoTier.TOP }
  ];

  for (const config of promoConfigurations) {
    await prisma.promoBoost.create({
      data: {
        agentId: agentUsers[config.agentIndex].id,
        propertyId: properties[config.propertyIndex].id,
        tier: config.tier,
        startAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        endAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        usdCents: config.tier === PromoTier.TOP ? 7500 : 4500
      }
    });
  }

  await prisma.rewardPool.upsert({
    where: { id: 'seed-pool' },
    update: { balanceUsd: 5000 - agentUsers.length * 20 },
    create: { id: 'seed-pool', balanceUsd: 5000 }
  });

  console.log('Seed completed', {
    admin: admin.email,
    verifiers: verifierUsers.length,
    agents: agentUsers.length,
    landlords: landlordUsers.length,
    consumers: consumerUsers.length,
    properties: properties.length
  });
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
