import {
  Currency,
  KycIdType,
  KycStatus,
  LeadSource,
  LeadStatus,
  MediaKind,
  OwnerType,
  PolicyStrikeReason,
  PayoutMethod,
  PayoutStatus,
  PowerPhase,
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
          idNumber: `AG-${(index + 1).toString().padStart(5, '0')}`,
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
          idNumber: `AG-${(index + 1).toString().padStart(5, '0')}`,
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
          displayName: `${agent.name.split(' ')[0]} EcoCash`,
          detailsJson: {
            ecocashNumber: `+2637710${(200 + index).toString().padStart(3, '0')}`
          },
          verifiedAt: new Date(Date.now() - index * 86400000)
        },
        create: {
          id: `seed-payout-${agent.id}`,
          ownerType: OwnerType.USER,
          ownerId: agent.id,
          type: PayoutMethod.ECOCASH,
          displayName: `${agent.name.split(' ')[0]} EcoCash`,
          detailsJson: {
            ecocashNumber: `+2637710${(200 + index).toString().padStart(3, '0')}`
          },
          verifiedAt: new Date(Date.now() - index * 86400000)
        }
      })
    )
  );

  for (const [index, agent] of agentUsers.slice(0, 6).entries()) {
    const wallet = walletByAgentId.get(agent.id);
    if (!wallet) {
      continue;
    }

    const maturedAmount = 18000 + index * 1200;
    const pendingAmount = 3600 + index * 300;
    const maturedAt = new Date(Date.now() - (index + 3) * 86400000);
    const pendingAvailableAt = new Date(Date.now() + (index + 2) * 86400000);

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
        const amount = 6000 + index * 1000;
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
            createdAt: new Date(Date.now() - (index + 1) * 86400000)
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

  const properties = [] as Array<{ id: string }>;
  for (let index = 0; index < 50; index++) {
    const agent = agentUsers[index % agentUsers.length];
    const landlord = landlordUsers[index % landlordUsers.length];
    const suburb = HARARE_SUBURBS[index % HARARE_SUBURBS.length];
    const suburbRecord = suburbMap.get(suburb)!;
    const type = propertyTypes[index % propertyTypes.length];
    const status = propertyStatuses[index % propertyStatuses.length];
    const currency = index % 4 === 0 ? Currency.ZWG : Currency.USD;
    const isResidential = residentialTypes.has(type);
    const isCommercial = commercialTypes.has(type);
    const isSaleListing = saleTypes.has(type);
    const priceBase = isSaleListing
      ? 45000 + index * 2500
      : isCommercial
        ? 1200 + index * 80
        : 250 + index * 12;
    const availability = index % 5 === 0 ? PropertyAvailability.DATE : PropertyAvailability.IMMEDIATE;
    const availableFrom = availability === PropertyAvailability.DATE
      ? new Date(Date.now() + (index % 10) * 86400000)
      : null;
    const furnishing = isResidential
      ? index % 3 === 0
        ? PropertyFurnishing.FULLY
        : index % 3 === 1
          ? PropertyFurnishing.PARTLY
          : PropertyFurnishing.NONE
      : PropertyFurnishing.NONE;
    const amenities = isResidential
      ? ['WiFi', index % 2 === 0 ? 'Parking' : 'Borehole', 'Security']
      : ['Generator', 'Parking', 'Road frontage'];
    const commercialFieldsValue = isCommercial
      ? {
          floorAreaSqm: 120 + index * 15,
          lotSizeSqm: 600 + index * 20,
          parkingBays: (index % 6) + 2,
          powerPhase: index % 2 === 0 ? PowerPhase.SINGLE : PowerPhase.THREE,
          loadingBay: type === PropertyType.WAREHOUSE || index % 4 === 0,
          zoning: index % 2 === 0 ? 'Commercial' : 'Industrial',
          complianceDocsUrl: 'https://cdn.propad.co.zw/docs/compliance-sample.pdf'
        }
      : Prisma.JsonNull;
    const bedrooms = isResidential ? (type === PropertyType.ROOM ? 1 : 3 + (index % 3)) : null;
    const bathrooms = isResidential ? (type === PropertyType.ROOM ? 1 : 2 + (index % 2)) : null;
    const typeLabel = type.replace(/_/g, ' ').toLowerCase();
    const description = isCommercial
      ? `${typeLabel} with ${amenities.join(', ')} and flexible lease terms.`
      : `${typeLabel} in ${suburb} with modern finishes and close to amenities.`;
    const lat = -17.8292 + index * 0.001;
    const lng = 31.0522 + index * 0.001;

    const property = await prisma.property.create({
      data: {
        landlordId: landlord.id,
        agentOwnerId: agent.id,
        type,
        currency,
        price: new Prisma.Decimal(priceBase.toFixed(2)),
        countryId: country.id,
        provinceId: province.id,
        cityId: city.id,
        suburbId: suburbRecord.id,
        pendingGeoId: null,
        lat,
        lng,
        bedrooms,
        bathrooms,
        amenities,
        furnishing,
        availability,
        availableFrom,
        commercialFields: commercialFieldsValue,
        description,
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
