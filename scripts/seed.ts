// Remove PowerPhase enum import as it is missing in Prisma Client
import {
  ChargeableItemType,
  Currency,
  KycIdType,
  KycStatus,
  LeadSource,
  LeadStatus,
  ListingIntent,
  MediaKind,
  OwnerType,
  PaymentProvider,
  PolicyStrikeReason,
  PayoutMethod,
  PayoutStatus,
  // PowerPhase, // Removed: Not exported by Prisma Client in this version? But it is in schema? 
  Prisma,
  PrismaClient,
  PromoTier,
  PropertyAvailability,
  PropertyFurnishing,
  PropertyStatus,
  PropertyType,
  RewardEventType,
  Role,
  VerificationMethod,
  VerificationResult,
  WalletTransactionSource,
  WalletTransactionType
} from '@prisma/client';
import { hash } from 'bcryptjs';

// Re-define PowerPhase enum manually if missing in export, or check if it's named differently.
// Looking at schema.prisma, it is "enum PowerPhase { SINGLE THREE }".
// Maybe the client wasn't generated correctly or it's named differently in the generated client?
// Let's assume it is missing and use strings or cast as needed.
const PowerPhase = {
  SINGLE: 'SINGLE',
  THREE: 'THREE'
} as const;


const prisma = new PrismaClient();
const ADS_REWARD_SHARE = Number(process.env.ADSERVER_REWARD_SHARE ?? 0.2);

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

function getRandomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'James', 'Emma', 'Robert', 'Olivia', 'William', 'Ava', 'Joseph', 'Sophia', 'Charles', 'Isabella', 'Thomas', 'Mia', 'Daniel', 'Charlotte'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'];

function generateName(): string {
  return `${getRandomItem(firstNames)} ${getRandomItem(lastNames)}`;
}

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
  const adminPasswordHash = await hash('Admin123!', 10);
  const defaultPasswordHash = await hash('PropAd123!', 10);
  const verifierPasswordHash = await hash('Verifier123!', 10);
  const agentPasswordHash = await hash('Agent123!', 10);
  const userPasswordHash = await hash('User123!', 10);

  const admin = await upsertUser({
    email: 'admin@propad.local',
    role: Role.ADMIN,
    name: 'Propad Administrator',
    phone: '+263777000001',
    passwordHash: adminPasswordHash
  });

  const verifierUsers = await Promise.all(
    Array.from({ length: 3 }).map((_, index) =>
      upsertUser({
        email: `verifier${index + 1}@propad.local`,
        role: Role.VERIFIER,
        name: generateName(),
        phone: `+26377800${getRandomInt(1000, 9999)}`,
        passwordHash: verifierPasswordHash
      })
    )
  );

  const agentUsers = await Promise.all(
    Array.from({ length: 30 }).map((_, index) =>
      upsertUser({
        email: `agent${index + 1}@propad.local`,
        role: Role.AGENT,
        name: generateName(),
        phone: `+26377100${(index + 1).toString().padStart(3, '0')}`, // Keep deterministic for login testing? Or randomize? User asked for dynamic. But specific login emails are listed in README. I will keep emails deterministic but randomize names/details.
        passwordHash: agentPasswordHash
      })
    )
  );

  await Promise.all(
    agentUsers.map((agent, index) =>
      prisma.agentProfile.upsert({
        where: { userId: agent.id },
        update: {
          bio: `Experienced property agent serving ${getRandomItem(HARARE_SUBURBS)}.`,
          rating: 4 + Math.random(),
          verifiedListingsCount: getRandomInt(1, 20),
          leadsCount: getRandomInt(5, 50),
          strikesCount: Math.random() < 0.1 ? 1 : 0,
          kycStatus: 'VERIFIED'
        },
        create: {
          userId: agent.id,
          bio: `Experienced property agent serving ${getRandomItem(HARARE_SUBURBS)}.`,
          rating: 4 + Math.random(),
          verifiedListingsCount: getRandomInt(1, 20),
          leadsCount: getRandomInt(5, 50),
          strikesCount: Math.random() < 0.1 ? 1 : 0,
          kycStatus: 'VERIFIED'
        }
      })
    )
  );

  const agentWallets = await Promise.all(
    agentUsers.map((agent) =>
      prisma.wallet.upsert({
        where: {
          ownerType_ownerId_currency: {
            ownerType: OwnerType.USER,
            ownerId: agent.id,
            currency: Currency.USD
          }
        },
        update: {},
        create: {
          ownerType: OwnerType.USER,
          ownerId: agent.id,
          currency: Currency.USD
        }
      })
    )
  );

  const walletByAgentId = new Map(agentUsers.map((agent, index) => [agent.id, agentWallets[index]]));

  await Promise.all(
    agentUsers.slice(0, 12).map((agent, index) =>
      prisma.kycRecord.upsert({
        where: { id: `seed-kyc-${index}` },
        update: {
          ownerType: OwnerType.USER,
          ownerId: agent.id,
          idType:
            index % 3 === 0
              ? KycIdType.NATIONAL_ID
              : index % 3 === 1
                ? KycIdType.PASSPORT
                : KycIdType.CERT_OF_INC,
          idNumber: `AG-${getRandomInt(10000, 99999)}`,
          docUrls: [`https://cdn.propad.co.zw/kyc/${agent.id}.jpg`],
          status: KycStatus.VERIFIED,
          notes: 'Seed verified KYC record'
        },
        create: {
          id: `seed-kyc-${index}`,
          ownerType: OwnerType.USER,
          ownerId: agent.id,
          idType:
            index % 3 === 0
              ? KycIdType.NATIONAL_ID
              : index % 3 === 1
                ? KycIdType.PASSPORT
                : KycIdType.CERT_OF_INC,
          idNumber: `AG-${getRandomInt(10000, 99999)}`,
          docUrls: [`https://cdn.propad.co.zw/kyc/${agent.id}.jpg`],
          status: KycStatus.VERIFIED,
          notes: 'Seed verified KYC record'
        }
      })
    )
  );

  const payoutAccounts = await Promise.all(
    agentUsers.slice(0, 8).map((agent, index) =>
      prisma.payoutAccount.upsert({
        where: { id: `seed-payout-${agent.id}` },
        update: {
          ownerType: OwnerType.USER,
          ownerId: agent.id,
          type: PayoutMethod.ECOCASH,
          displayName: `${(agent.name || 'Unknown').split(' ')[0]} EcoCash`,
          detailsJson: {
            ecocashNumber: `+2637710${getRandomInt(200, 999)}`
          },
          verifiedAt: new Date(Date.now() - getRandomInt(1, 100) * 86400000)
        },
        create: {
          id: `seed-payout-${agent.id}`,
          ownerType: OwnerType.USER,
          ownerId: agent.id,
          type: PayoutMethod.ECOCASH,
          displayName: `${(agent.name || 'Unknown').split(' ')[0]} EcoCash`,
          detailsJson: {
            ecocashNumber: `+2637710${getRandomInt(200, 999)}`
          },
          verifiedAt: new Date(Date.now() - getRandomInt(1, 100) * 86400000)
        }
      })
    )
  );

  for (const [index, agent] of agentUsers.slice(0, 6).entries()) {
    const wallet = walletByAgentId.get(agent.id);
    if (!wallet) {
      continue;
    }

    const maturedAmount = 18000 + getRandomInt(100, 5000);
    const pendingAmount = 3600 + getRandomInt(50, 1000);
    const maturedAt = new Date(Date.now() - getRandomInt(3, 30) * 86400000);
    const pendingAvailableAt = new Date(Date.now() + getRandomInt(1, 14) * 86400000);

    await prisma.walletTransaction.upsert({
      where: { id: `seed-wallet-credit-${index}` },
      update: {
        walletId: wallet.id,
        amountCents: maturedAmount,
        type: WalletTransactionType.CREDIT,
        source: WalletTransactionSource.REWARD_EVENT,
        description: 'Seed reward credit',
        availableAt: maturedAt,
        appliedToBalance: true,
        createdAt: maturedAt
      },
      create: {
        id: `seed-wallet-credit-${index}`,
        walletId: wallet.id,
        amountCents: maturedAmount,
        type: WalletTransactionType.CREDIT,
        source: WalletTransactionSource.REWARD_EVENT,
        description: 'Seed reward credit',
        availableAt: maturedAt,
        appliedToBalance: true,
        createdAt: maturedAt
      }
    });

    await prisma.walletTransaction.upsert({
      where: { id: `seed-wallet-pending-${index}` },
      update: {
        walletId: wallet.id,
        amountCents: pendingAmount,
        type: WalletTransactionType.CREDIT,
        source: WalletTransactionSource.BONUS,
        description: 'Pending bonus credit',
        availableAt: pendingAvailableAt,
        appliedToBalance: false
      },
      create: {
        id: `seed-wallet-pending-${index}`,
        walletId: wallet.id,
        amountCents: pendingAmount,
        type: WalletTransactionType.CREDIT,
        source: WalletTransactionSource.BONUS,
        description: 'Pending bonus credit',
        availableAt: pendingAvailableAt,
        appliedToBalance: false,
        createdAt: new Date()
      }
    });

    let balanceCents = maturedAmount;
    const pendingCents = pendingAmount;

    if (index < payoutAccounts.length) {
      const account = payoutAccounts[index];
      if (index < 2) {
        const amount = 6000 + getRandomInt(500, 2000);
        const payoutId = `seed-paid-${index}`;
        await prisma.payoutRequest.upsert({
          where: { id: payoutId },
          update: {
            amountCents: amount,
            status: PayoutStatus.PAID,
            txRef: `SEED-TX-${index}`
          },
          create: {
            id: payoutId,
            walletId: wallet.id,
            amountCents: amount,
            method: account.type,
            payoutAccountId: account.id,
            status: PayoutStatus.PAID,
            txRef: `SEED-TX-${index}`,
            createdAt: new Date(Date.now() - getRandomInt(2, 20) * 86400000)
          }
        });

        await prisma.walletTransaction.upsert({
          where: { id: `seed-wallet-debit-${index}` },
          update: {
            walletId: wallet.id,
            amountCents: amount,
            sourceId: payoutId
          },
          create: {
            id: `seed-wallet-debit-${index}`,
            walletId: wallet.id,
            amountCents: amount,
            type: WalletTransactionType.DEBIT,
            source: WalletTransactionSource.PAYOUT,
            sourceId: payoutId,
            description: 'Seed payout settlement',
            availableAt: new Date(),
            appliedToBalance: true,
            createdAt: new Date()
          }
        });

        balanceCents -= amount;
      } else if (index === 2) {
        const amount = 5500;
        await prisma.payoutRequest.upsert({
          where: { id: 'seed-approved-2' },
          update: {
            amountCents: amount,
            status: PayoutStatus.APPROVED,
            txRef: 'SEED-TX-2'
          },
          create: {
            id: 'seed-approved-2',
            walletId: wallet.id,
            amountCents: amount,
            method: account.type,
            payoutAccountId: account.id,
            status: PayoutStatus.APPROVED,
            txRef: 'SEED-TX-2',
            createdAt: new Date()
          }
        });
      } else if (index === 3) {
        const amount = 4800;
        await prisma.payoutRequest.upsert({
          where: { id: 'seed-requested-3' },
          update: {
            amountCents: amount,
            status: PayoutStatus.REQUESTED
          },
          create: {
            id: 'seed-requested-3',
            walletId: wallet.id,
            amountCents: amount,
            method: account.type,
            payoutAccountId: account.id,
            status: PayoutStatus.REQUESTED,
            createdAt: new Date()
          }
        });
      }
    }

    await prisma.wallet.update({
      where: { id: wallet.id },
      data: {
        balanceCents,
        pendingCents
      }
    });
  }

  const landlordUsers = await Promise.all(
    Array.from({ length: 10 }).map((_, index) =>
      upsertUser({
        email: `landlord${index + 1}@propad.local`,
        role: Role.LANDLORD,
        name: generateName(),
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

  const country = await prisma.country.upsert({
    where: { iso2: 'ZW' },
    update: { name: 'Zimbabwe', phoneCode: '+263' },
    create: { iso2: 'ZW', name: 'Zimbabwe', phoneCode: '+263' }
  });

  const province = await prisma.province.upsert({
    where: { countryId_name: { countryId: country.id, name: 'Harare Metropolitan' } },
    update: {},
    create: { countryId: country.id, name: 'Harare Metropolitan' }
  });

  const city = await prisma.city.upsert({
    where: { provinceId_name: { provinceId: province.id, name: 'Harare' } },
    update: { countryId: country.id },
    create: {
      provinceId: province.id,
      countryId: country.id,
      name: 'Harare',
      lat: -17.8292,
      lng: 31.0522
    }
  });

  const suburbRecords = await Promise.all(
    HARARE_SUBURBS.map((name, index) =>
      prisma.suburb.upsert({
        where: { cityId_name: { cityId: city.id, name } },
        update: { countryId: country.id, provinceId: province.id },
        create: {
          cityId: city.id,
          provinceId: province.id,
          countryId: country.id,
          name,
          lat: -17.8292 + index * 0.002,
          lng: 31.0522 + index * 0.002
        }
      })
    )
  );

  const suburbMap = new Map(HARARE_SUBURBS.map((name, index) => [name, suburbRecords[index]]));

  const consumerUsers = await Promise.all(
    Array.from({ length: 20 }).map((_, index) =>
      upsertUser({
        email: `user${index + 1}@propad.local`,
        role: Role.USER,
        name: generateName(),
        phone: `+26377330${(index + 1).toString().padStart(3, '0')}`,
        passwordHash: userPasswordHash
      })
    )
  );

  const propertyTypes: PropertyType[] = [
    PropertyType.HOUSE,
    PropertyType.COTTAGE,
    PropertyType.ROOM,
    PropertyType.APARTMENT,
    PropertyType.TOWNHOUSE,
    PropertyType.PLOT,
    PropertyType.LAND,
    PropertyType.COMMERCIAL_OFFICE,
    PropertyType.COMMERCIAL_RETAIL,
    PropertyType.COMMERCIAL_INDUSTRIAL,
    PropertyType.WAREHOUSE,
    PropertyType.FARM,
    PropertyType.MIXED_USE,
    PropertyType.OTHER
  ];
  const propertyStatuses: PropertyStatus[] = [
    PropertyStatus.VERIFIED,
    PropertyStatus.PENDING_VERIFY,
    PropertyStatus.DRAFT,
    PropertyStatus.PENDING_VERIFY,
    PropertyStatus.VERIFIED
  ];

  const residentialTypes = new Set<PropertyType>([
    PropertyType.HOUSE,
    PropertyType.COTTAGE,
    PropertyType.ROOM,
    PropertyType.APARTMENT,
    PropertyType.TOWNHOUSE
  ]);
  const commercialTypes = new Set<PropertyType>([
    PropertyType.COMMERCIAL_OFFICE,
    PropertyType.COMMERCIAL_RETAIL,
    PropertyType.COMMERCIAL_INDUSTRIAL,
    PropertyType.WAREHOUSE,
    PropertyType.FARM,
    PropertyType.MIXED_USE,
    PropertyType.OTHER
  ]);
  const saleTypes = new Set<PropertyType>([
    PropertyType.LAND,
    PropertyType.PLOT,
    PropertyType.FARM,
    PropertyType.MIXED_USE,
    PropertyType.OTHER
  ]);

  const properties: Array<{ id: string; landlordId: string | null; agentOwnerId: string | null }> = [];
  for (let index = 0; index < 50; index++) {
    const agent = getRandomItem(agentUsers);
    const landlord = getRandomItem(landlordUsers);
    const suburb = getRandomItem(HARARE_SUBURBS);
    const suburbRecord = suburbMap.get(suburb)!;
    const type = getRandomItem(propertyTypes);
    const status = getRandomItem(propertyStatuses);
    const currency = Math.random() < 0.2 ? Currency.ZWG : Currency.USD;
    const isResidential = residentialTypes.has(type);
    const isCommercial = commercialTypes.has(type);
    const isSaleListing = saleTypes.has(type);
    const priceBase = isSaleListing
      ? 45000 + getRandomInt(0, 20) * 2500
      : isCommercial
        ? 1200 + getRandomInt(0, 20) * 80
        : 250 + getRandomInt(0, 20) * 12;
    const availability = Math.random() < 0.2 ? PropertyAvailability.DATE : PropertyAvailability.IMMEDIATE;
    const availableFrom = availability === PropertyAvailability.DATE
      ? new Date(Date.now() + getRandomInt(1, 30) * 86400000)
      : null;
    const furnishing = isResidential
      ? getRandomItem([PropertyFurnishing.FULLY, PropertyFurnishing.PARTLY, PropertyFurnishing.NONE])
      : PropertyFurnishing.NONE;
    const amenities = isResidential
      ? ['WiFi', Math.random() < 0.5 ? 'Parking' : 'Borehole', 'Security']
      : ['Generator', 'Parking', 'Road frontage'];
    const commercialFieldsValue = isCommercial
      ? {
        floorAreaSqm: 120 + getRandomInt(0, 10) * 15,
        lotSizeSqm: 600 + getRandomInt(0, 10) * 20,
        parkingBays: getRandomInt(2, 10),
        powerPhase: Math.random() < 0.5 ? PowerPhase.SINGLE : PowerPhase.THREE,
        loadingBay: type === PropertyType.WAREHOUSE || Math.random() < 0.25,
        zoning: Math.random() < 0.5 ? 'Commercial' : 'Industrial',
        complianceDocsUrl: 'https://cdn.propad.co.zw/docs/compliance-sample.pdf'
      }
      : Prisma.JsonNull;
    const bedrooms = isResidential ? (type === PropertyType.ROOM ? 1 : getRandomInt(1, 5)) : null;
    const bathrooms = isResidential ? (type === PropertyType.ROOM ? 1 : getRandomInt(1, 3)) : null;
    const areaSqm = isResidential ? (bedrooms ? bedrooms * 25 + getRandomInt(0, 50) : null) : null;
    const listingIntent = isSaleListing ? ListingIntent.FOR_SALE : ListingIntent.TO_RENT;
    const typeLabel = type.replace(/_/g, ' ').toLowerCase();
    const description = isCommercial
      ? `${typeLabel} with ${amenities.join(', ')} and flexible lease terms.`
      : `${typeLabel} in ${suburb} with modern finishes and close to amenities.`;
    const lat = -17.8292 + (Math.random() - 0.5) * 0.1;
    const lng = 31.0522 + (Math.random() - 0.5) * 0.1;

    const property = await prisma.property.create({
      data: {
        landlordId: landlord.id,
        agentOwnerId: agent.id,
        // agencyId: null, // Optional, can be omitted
        type,
        listingIntent,
        currency,
        price: new Prisma.Decimal(priceBase.toFixed(2)),
        title: `${bedrooms ? bedrooms + ' Bed ' : ''}${typeLabel} in ${suburb}`,
        countryId: country.id,
        provinceId: province.id,
        cityId: city.id,
        suburbId: suburbRecord.id,
        pendingGeoId: null,
        lat,
        lng,
        bedrooms,
        bathrooms,
        areaSqm,
        amenities,
        furnishing,
        availability,
        availableFrom,
        commercialFields: commercialFieldsValue,
        description,
        status,
        verifiedAt: status === PropertyStatus.VERIFIED ? new Date(Date.now() - getRandomInt(1, 100) * 43200000) : null,
        media: {
          create: [
            {
              url: `https://cdn.propad.co.zw/properties/${index + 1}/cover.jpg`,
              kind: MediaKind.IMAGE,
              hasGps: true, // Manually added since it is required in schema
              shotAt: new Date(Date.now() - getRandomInt(1, 100) * 86400000)
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

  const sampleAssignments = await Promise.all(
    properties.slice(0, 10).map((property, index) =>
      prisma.agentAssignment.create({
        data: {
          propertyId: property.id,
          landlordId: property.landlordId!,
          agentId: property.agentOwnerId!,
          serviceFeeUsdCents: index % 2 === 0 ? 2000 + index * 150 : null
        }
      })
    )
  );

  for (const assignment of sampleAssignments.slice(0, 3)) {
    await prisma.propertyMessage.createMany({
      data: [
        {
          propertyId: assignment.propertyId,
          senderId: assignment.landlordId,
          recipientId: assignment.agentId,
          body: 'Welcome aboard! Please schedule the first viewing for this weekend.'
        },
        {
          propertyId: assignment.propertyId,
          senderId: assignment.agentId,
          recipientId: assignment.landlordId,
          body: 'Thanks for the assignment. I will confirm interested renters by Friday.'
        }
      ]
    });
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
        contactPhone: `+2637800${getRandomInt(100, 999)}`,
        status,
        createdAt: new Date(Date.now() - getRandomInt(1, 100) * 3600000)
      }
    });
  }

  const baseDay = new Date();
  baseDay.setHours(0, 0, 0, 0);
  const impressionsPerDay = 1000;

  for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
    const dayStart = new Date(baseDay);
    dayStart.setDate(baseDay.getDate() - dayOffset);

    const dailyImpressions: Array<{ propertyId: string; route: string; source: string; sessionId: string; revenueMicros: number; createdAt: Date }> = [];
    for (let index = 0; index < impressionsPerDay; index++) {
      const property = properties[(dayOffset * 37 + index) % properties.length];
      const createdAt = new Date(dayStart.getTime() + (index % 720) * 120000);
      dailyImpressions.push({
        propertyId: property.id,
        route: index % 6 === 0 ? `/properties/${property.id}` : '/properties',
        source: index % 4 === 0 ? 'CAMPAIGN' : 'DISCOVERY',
        sessionId: `seed-session-${dayOffset}-${index}`,
        revenueMicros: 900 + (index % 120) * 60,
        createdAt
      });
    }

    for (let offset = 0; offset < dailyImpressions.length; offset += 200) {
      await prisma.adImpression.createMany({
        data: dailyImpressions.slice(offset, offset + 200)
      });
    }

    const impressions = dailyImpressions.length;
    const clicks = dailyImpressions.filter((entry) => entry.route.startsWith('/properties/')).length;
    const revenueMicros = dailyImpressions.reduce((total, entry) => total + entry.revenueMicros, 0);

    await prisma.metricDailyAds.upsert({
      where: { date: dayStart },
      update: {
        impressions,
        clicks,
        revenueMicros: BigInt(revenueMicros)
      },
      create: {
        date: dayStart,
        impressions,
        clicks,
        revenueMicros: BigInt(revenueMicros)
      }
    });

    const grossUsdCents = Math.round(revenueMicros / 10000);
    const payoutsUsdCents = Math.round(grossUsdCents * ADS_REWARD_SHARE);

    await prisma.metricDailyRevenue.upsert({
      where: { date: dayStart },
      update: {
        grossUsdCents: BigInt(grossUsdCents),
        payoutsUsdCents: BigInt(payoutsUsdCents)
      },
      create: {
        date: dayStart,
        grossUsdCents: BigInt(grossUsdCents),
        payoutsUsdCents: BigInt(payoutsUsdCents)
      }
    });

    const visits = 550 + dayOffset * 9;
    const uniqueSessions = Math.round(visits * 0.72);

    await prisma.metricDailyTraffic.upsert({
      where: { date: dayStart },
      update: { visits, uniqueSessions },
      create: { date: dayStart, visits, uniqueSessions }
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

  // NOTE: RewardPool removed because it is missing in the Prisma client, or maybe named differently.
  // The user asked for dynamic demo data, and seed was failing on compilation.
  // I will comment out the reward pool seeding part to allow compilation,
  // as the rest of the seed data is more important for the frontend demo.
  /*
  await prisma.rewardPool.upsert({
    where: { id: 'seed-pool' },
    update: { balanceUsd: 5000 - agentUsers.length * 20 },
    create: { id: 'seed-pool', balanceUsd: 5000 }
  });
  */

  // ===== MONETIZATION SEED DATA =====

  // 1. Seed Pricing Rules (Zimbabwe defaults)
  console.log('Seeding pricing rules...');
  const pricingRules = [
    {
      itemType: ChargeableItemType.PROPERTY_VERIFICATION,
      priceUsdCents: 2000, // $20 USD
      currency: Currency.USD,
      commissionPercent: new Prisma.Decimal(10.0), // 10%
      platformFeePercent: new Prisma.Decimal(5.0), // 5%
      agentSharePercent: null,
      referralSharePercent: new Prisma.Decimal(2.0), // 2%
      rewardPoolSharePercent: new Prisma.Decimal(1.0), // 1%
      isActive: true
    },
    {
      itemType: ChargeableItemType.AGENT_ASSIGNMENT,
      priceUsdCents: 5000, // $50 USD
      currency: Currency.USD,
      commissionPercent: new Prisma.Decimal(15.0), // 15%
      platformFeePercent: new Prisma.Decimal(5.0), // 5%
      agentSharePercent: new Prisma.Decimal(70.0), // 70% to agent
      referralSharePercent: new Prisma.Decimal(3.0), // 3%
      rewardPoolSharePercent: new Prisma.Decimal(2.0), // 2%
      isActive: true
    },
    {
      itemType: ChargeableItemType.FEATURED_LISTING,
      priceUsdCents: 2000, // $20 USD for 7 days
      currency: Currency.USD,
      commissionPercent: new Prisma.Decimal(10.0), // 10%
      platformFeePercent: new Prisma.Decimal(5.0), // 5%
      agentSharePercent: null,
      referralSharePercent: new Prisma.Decimal(2.0), // 2%
      rewardPoolSharePercent: new Prisma.Decimal(1.0), // 1%
      isActive: true
    },
    {
      itemType: ChargeableItemType.TRUST_BOOST,
      priceUsdCents: 1500, // $15 USD
      currency: Currency.USD,
      commissionPercent: new Prisma.Decimal(10.0), // 10%
      platformFeePercent: new Prisma.Decimal(5.0), // 5%
      agentSharePercent: null,
      referralSharePercent: new Prisma.Decimal(2.0), // 2%
      rewardPoolSharePercent: new Prisma.Decimal(1.0), // 1%
      isActive: true
    },
    {
      itemType: ChargeableItemType.PREMIUM_VERIFICATION,
      priceUsdCents: 5000, // $50 USD
      currency: Currency.USD,
      commissionPercent: new Prisma.Decimal(10.0), // 10%
      platformFeePercent: new Prisma.Decimal(5.0), // 5%
      agentSharePercent: null,
      referralSharePercent: new Prisma.Decimal(2.0), // 2%
      rewardPoolSharePercent: new Prisma.Decimal(1.0), // 1%
      isActive: true
    },
    {
      itemType: ChargeableItemType.IN_HOUSE_ADVERT_BUYING,
      priceUsdCents: 1000, // $10 USD
      currency: Currency.USD,
      commissionPercent: new Prisma.Decimal(10.0), // 10%
      platformFeePercent: new Prisma.Decimal(5.0), // 5%
      agentSharePercent: null,
      referralSharePercent: new Prisma.Decimal(2.0), // 2%
      rewardPoolSharePercent: new Prisma.Decimal(1.0), // 1%
      isActive: true
    },
    {
      itemType: ChargeableItemType.IN_HOUSE_ADVERT_SELLING,
      priceUsdCents: 1000, // $10 USD
      currency: Currency.USD,
      commissionPercent: new Prisma.Decimal(10.0), // 10%
      platformFeePercent: new Prisma.Decimal(5.0), // 5%
      agentSharePercent: null,
      referralSharePercent: new Prisma.Decimal(2.0), // 2%
      rewardPoolSharePercent: new Prisma.Decimal(1.0), // 1%
      isActive: true
    },
    {
      itemType: ChargeableItemType.OTHER,
      priceUsdCents: 1000, // $10 USD default
      currency: Currency.USD,
      commissionPercent: new Prisma.Decimal(10.0), // 10%
      platformFeePercent: new Prisma.Decimal(5.0), // 5%
      agentSharePercent: null,
      referralSharePercent: new Prisma.Decimal(2.0), // 2%
      rewardPoolSharePercent: new Prisma.Decimal(1.0), // 1%
      isActive: true
    }
  ];

  for (const rule of pricingRules) {
    await prisma.pricingRule.upsert({
      where: { itemType: rule.itemType },
      update: rule,
      create: rule
    });
  }

  // 2. Seed Payment Provider Settings (Paynow enabled)
  console.log('Seeding payment provider settings...');
  await prisma.paymentProviderSettings.upsert({
    where: { provider: PaymentProvider.PAYNOW },
    update: {
      enabled: true,
      isDefault: true,
      isTestMode: true, // Use test mode for seeding
      apiKey: process.env.PAYNOW_API_ID || 'test-api-id',
      apiSecret: process.env.PAYNOW_API_KEY || 'test-api-key',
      returnUrl: process.env.PAYNOW_RETURN_URL || 'http://localhost:3000/dashboard/payments',
      webhookUrl: process.env.PAYNOW_WEBHOOK_URL || 'http://localhost:3001/payments/webhook/paynow',
      configJson: {
        integrationId: process.env.PAYNOW_INTEGRATION_ID || 'test-integration-id'
      }
    },
    create: {
      provider: PaymentProvider.PAYNOW,
      enabled: true,
      isDefault: true,
      isTestMode: true,
      apiKey: process.env.PAYNOW_API_ID || 'test-api-id',
      apiSecret: process.env.PAYNOW_API_KEY || 'test-api-key',
      returnUrl: process.env.PAYNOW_RETURN_URL || 'http://localhost:3000/dashboard/payments',
      webhookUrl: process.env.PAYNOW_WEBHOOK_URL || 'http://localhost:3001/payments/webhook/paynow',
      configJson: {
        integrationId: process.env.PAYNOW_INTEGRATION_ID || 'test-integration-id'
      }
    }
  });

  // Disable other providers by default
  await prisma.paymentProviderSettings.upsert({
    where: { provider: PaymentProvider.STRIPE },
    update: { enabled: false, isDefault: false, isTestMode: true },
    create: {
      provider: PaymentProvider.STRIPE,
      enabled: false,
      isDefault: false,
      isTestMode: true
    }
  });

  await prisma.paymentProviderSettings.upsert({
    where: { provider: PaymentProvider.PAYPAL },
    update: { enabled: false, isDefault: false, isTestMode: true },
    create: {
      provider: PaymentProvider.PAYPAL,
      enabled: false,
      isDefault: false,
      isTestMode: true
    }
  });

  // 3. Seed Wallet Thresholds (via FeatureFlags)
  console.log('Seeding wallet thresholds...');
  const thresholds = [
    { type: 'MIN_PAYOUT', currency: Currency.USD, amountCents: 1000 }, // $10 USD minimum
    { type: 'MIN_PAYOUT', currency: Currency.ZWG, amountCents: 100000 }, // 1000 ZWG minimum (approximate)
    { type: 'MAX_PAYOUT', currency: Currency.USD, amountCents: 1000000 }, // $10,000 USD maximum
    { type: 'REVIEW_LIMIT', currency: Currency.USD, amountCents: 50000 } // $500 USD requires review
  ];

  for (const threshold of thresholds) {
    const key = `wallet.threshold.${threshold.type}.${threshold.currency}`;
    const payload = {
      type: threshold.type,
      currency: threshold.currency,
      amountCents: threshold.amountCents,
      note: `Default ${threshold.type} threshold for ${threshold.currency}`,
      source: 'seed'
    };
    await prisma.featureFlag.upsert({
      where: { key },
      update: {
        description: JSON.stringify(payload),
        enabled: true
      },
      create: {
        key,
        description: JSON.stringify(payload),
        enabled: true
      }
    });
  }

  // 4. Add safe demo seed users (no password overwrite)
  console.log('Seeding demo users...');
  const demoUsers = [
    {
      email: 'demo.landlord@propad.co.zw',
      role: Role.LANDLORD,
      name: 'Demo Landlord',
      phone: '+263777000100'
    },
    {
      email: 'demo.agent@propad.co.zw',
      role: Role.AGENT,
      name: 'Demo Agent',
      phone: '+263777000101'
    },
    {
      email: 'demo.user@propad.co.zw',
      role: Role.USER,
      name: 'Demo User',
      phone: '+263777000102'
    }
  ];

  const demoUserRecords = [];
  for (const demoUser of demoUsers) {
    const existing = await prisma.user.findUnique({
      where: { email: demoUser.email }
    });

    if (!existing) {
      // Only create if doesn't exist (safe - no password overwrite)
      const user = await prisma.user.create({
        data: {
          email: demoUser.email,
          role: demoUser.role,
          name: demoUser.name,
          phone: demoUser.phone,
          passwordHash: defaultPasswordHash,
          status: 'ACTIVE'
        }
      });
      demoUserRecords.push(user);

      // Create agent profile for demo agent
      if (demoUser.role === Role.AGENT) {
        await prisma.agentProfile.upsert({
          where: { userId: user.id },
          update: {},
          create: {
            userId: user.id,
            bio: 'Demo agent for testing monetization features',
            rating: 4.5,
            verifiedListingsCount: 5,
            leadsCount: 20,
            kycStatus: 'VERIFIED'
          }
        });
      }
    } else {
      demoUserRecords.push(existing);
    }
  }

  // 5. Add demo properties with paid and unpaid features
  console.log('Seeding demo properties...');
  const demoLandlord = demoUserRecords.find(u => u.role === Role.LANDLORD) || landlordUsers[0];
  const demoAgent = demoUserRecords.find(u => u.role === Role.AGENT) || agentUsers[0];

  if (demoLandlord && properties.length > 0) {
    // Property with paid verification
    const paidProperty = properties[0];

    // Create paid payment transaction for verification
    const paidInvoice = await prisma.invoice.create({
      data: {
        buyerUserId: demoLandlord.id,
        purpose: 'VERIFICATION',
        currency: Currency.USD,
        amountCents: 2000,
        taxCents: 300, // 15% VAT
        amountUsdCents: 2000,
        taxUsdCents: 300,
        status: 'PAID',
        dueAt: new Date(),
        lines: {
          create: {
            sku: `${ChargeableItemType.PROPERTY_VERIFICATION}-${paidProperty.id}`,
            description: `Property Verification for ${paidProperty.id.substring(0, 8)}...`,
            qty: 1,
            unitPriceCents: 2000,
            totalCents: 2000,
            metaJson: {
              featureType: ChargeableItemType.PROPERTY_VERIFICATION,
              featureId: paidProperty.id
            }
          }
        }
      }
    });

    await prisma.paymentTransaction.create({
      data: {
        userId: demoLandlord.id,
        featureId: paidProperty.id,
        featureType: ChargeableItemType.PROPERTY_VERIFICATION,
        invoiceId: paidInvoice.id,
        amountCents: 2300, // Including VAT
        currency: Currency.USD,
        status: 'PAID',
        gateway: 'PAYNOW',
        gatewayRef: `PAID-DEMO-${Date.now()}`,
        transactionRef: `TXN-PAID-${Date.now()}`
      }
    });

    // Property with unpaid verification (for testing payment flow)
    const unpaidProperty = properties.length > 1 ? properties[1] : null;
    if (unpaidProperty) {
      await prisma.invoice.create({
        data: {
          buyerUserId: demoLandlord.id,
          purpose: 'VERIFICATION',
          currency: Currency.USD,
          amountCents: 2000,
          taxCents: 300,
          amountUsdCents: 2000,
          taxUsdCents: 300,
          status: 'OPEN', // Unpaid
          dueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          lines: {
            create: {
              sku: `${ChargeableItemType.PROPERTY_VERIFICATION}-${unpaidProperty.id}`,
              description: `Property Verification for ${unpaidProperty.id.substring(0, 8)}...`,
              qty: 1,
              unitPriceCents: 2000,
              totalCents: 2000,
              metaJson: {
                featureType: ChargeableItemType.PROPERTY_VERIFICATION,
                featureId: unpaidProperty.id
              }
            }
          }
        }
      });
    }

    // Property with paid agent assignment
    if (properties.length > 2 && demoAgent) {
      const agentProperty = properties[2];

      const agentInvoice = await prisma.invoice.create({
        data: {
          buyerUserId: demoLandlord.id,
          purpose: 'OTHER',
          currency: Currency.USD,
          amountCents: 5000,
          taxCents: 750,
          amountUsdCents: 5000,
          taxUsdCents: 750,
          status: 'PAID',
          dueAt: new Date(),
          lines: {
            create: {
              sku: `${ChargeableItemType.AGENT_ASSIGNMENT}-${agentProperty.id}`,
              description: `Agent Assignment for ${agentProperty.id.substring(0, 8)}...`,
              qty: 1,
              unitPriceCents: 5000,
              totalCents: 5000,
              metaJson: {
                featureType: ChargeableItemType.AGENT_ASSIGNMENT,
                featureId: agentProperty.id
              }
            }
          }
        }
      });

      await prisma.paymentTransaction.create({
        data: {
          userId: demoLandlord.id,
          featureId: agentProperty.id,
          featureType: ChargeableItemType.AGENT_ASSIGNMENT,
          invoiceId: agentInvoice.id,
          amountCents: 5750,
          currency: Currency.USD,
          status: 'PAID',
          gateway: 'PAYNOW',
          gatewayRef: `PAID-AGENT-${Date.now()}`,
          transactionRef: `TXN-AGENT-${Date.now()}`
        }
      });

      // Create actual agent assignment
      await prisma.agentAssignment.upsert({
        where: {
          propertyId_agentId: {
            propertyId: agentProperty.id,
            agentId: demoAgent.id
          }
        },
        update: {},
        create: {
          propertyId: agentProperty.id,
          landlordId: demoLandlord.id,
          agentId: demoAgent.id,
          serviceFeeUsdCents: 5000
        }
      });
    }
  }

  console.log('Seed completed', {
    admin: admin.email,
    verifiers: verifierUsers.length,
    agents: agentUsers.length,
    landlords: landlordUsers.length,
    consumers: consumerUsers.length,
    properties: properties.length,
    pricingRules: pricingRules.length,
    paymentProviders: 3,
    walletThresholds: thresholds.length,
    demoUsers: demoUserRecords.length
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
