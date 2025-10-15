import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit
} from '@nestjs/common';
import {
  GeoLevel,
  PendingGeoStatus,
  Prisma,
  type City,
  type Country,
  type PendingGeo,
  type Province,
  type Suburb
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ZIMBABWE_SEED } from './suburbs.data';

type LocationInput = {
  countryId?: string | null;
  provinceId?: string | null;
  cityId?: string | null;
  suburbId?: string | null;
  pendingGeoId?: string | null;
};

type ResolvedLocation = {
  country: Country | null;
  province: Province | null;
  city: City | null;
  suburb: Suburb | null;
  pendingGeo: PendingGeo | null;
};

interface SearchResult<T extends GeoLevel> {
  id: string;
  name: string;
  level: T;
  parentId?: string;
  provinceId?: string;
  countryId?: string;
}

@Injectable()
export class GeoService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.ensureSeedData();
  }

  async listCountries() {
    return this.prisma.country.findMany({
      orderBy: { name: 'asc' }
    });
  }

  async listProvinces(countryId: string) {
    await this.ensureCountryExists(countryId);
    return this.prisma.province.findMany({
      where: { countryId },
      orderBy: { name: 'asc' }
    });
  }

  async listCities(provinceId: string) {
    await this.ensureProvinceExists(provinceId);
    return this.prisma.city.findMany({
      where: { provinceId },
      orderBy: { name: 'asc' }
    });
  }

  async listSuburbs(cityId: string) {
    await this.ensureCityExists(cityId);
    return this.prisma.suburb.findMany({
      where: { cityId },
      orderBy: { name: 'asc' }
    });
  }

  async search(query: string) {
    const normalized = query.trim();
    if (!normalized) {
      return [] as SearchResult<GeoLevel>[];
    }

    const [countries, provinces, cities, suburbs] = await Promise.all([
      this.prisma.country.findMany({
        where: { name: { contains: normalized, mode: 'insensitive' } },
        orderBy: { name: 'asc' },
        take: 10
      }),
      this.prisma.province.findMany({
        where: { name: { contains: normalized, mode: 'insensitive' } },
        orderBy: { name: 'asc' },
        take: 10
      }),
      this.prisma.city.findMany({
        where: { name: { contains: normalized, mode: 'insensitive' } },
        orderBy: { name: 'asc' },
        take: 10
      }),
      this.prisma.suburb.findMany({
        where: { name: { contains: normalized, mode: 'insensitive' } },
        orderBy: { name: 'asc' },
        take: 10
      })
    ]);

    const results: SearchResult<GeoLevel>[] = [];

    for (const country of countries) {
      results.push({ id: country.id, name: country.name, level: GeoLevel.COUNTRY });
    }
    for (const province of provinces) {
      results.push({
        id: province.id,
        name: province.name,
        level: GeoLevel.PROVINCE,
        parentId: province.countryId,
        countryId: province.countryId
      });
    }
    for (const city of cities) {
      results.push({
        id: city.id,
        name: city.name,
        level: GeoLevel.CITY,
        parentId: city.provinceId,
        provinceId: city.provinceId,
        countryId: city.countryId
      });
    }
    for (const suburb of suburbs) {
      results.push({
        id: suburb.id,
        name: suburb.name,
        level: GeoLevel.SUBURB,
        parentId: suburb.cityId,
        provinceId: suburb.provinceId,
        countryId: suburb.countryId
      });
    }

    return results;
  }

  async createPending(
    level: GeoLevel,
    proposedName: string,
    proposedByUserId: string,
    parentId?: string | null
  ) {
    const normalized = proposedName.trim();
    if (!normalized) {
      throw new BadRequestException('proposedName is required');
    }

    await this.assertParentExists(level, parentId);
    await this.ensureNotDuplicate(level, normalized, parentId ?? undefined);

    return this.prisma.pendingGeo.create({
      data: {
        level,
        proposedName: normalized,
        parentId: parentId ?? null,
        proposedByUserId
      }
    });
  }

  async approvePending(id: string) {
    const pending = await this.prisma.pendingGeo.findUnique({ where: { id } });
    if (!pending) {
      throw new NotFoundException('Pending geo not found');
    }

    if (pending.status !== PendingGeoStatus.PENDING) {
      throw new BadRequestException('Pending geo is not awaiting approval');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      let createdId: string;

      if (pending.level === GeoLevel.COUNTRY) {
        const country = await tx.country.create({
          data: {
            name: pending.proposedName,
            iso2: pending.proposedName.slice(0, 2).toUpperCase(),
            phoneCode: ''
          }
        });
        createdId = country.id;
      } else if (pending.level === GeoLevel.PROVINCE) {
        if (!pending.parentId) {
          throw new BadRequestException('Province pending geo requires a countryId parent');
        }
        await this.ensureCountryExists(pending.parentId);
        const province = await tx.province.create({
          data: {
            name: pending.proposedName,
            countryId: pending.parentId
          }
        });
        createdId = province.id;
      } else if (pending.level === GeoLevel.CITY) {
        if (!pending.parentId) {
          throw new BadRequestException('City pending geo requires a provinceId parent');
        }
        const province = await tx.province.findUnique({
          where: { id: pending.parentId },
          include: { country: true }
        });
        if (!province) {
          throw new BadRequestException('Parent province not found');
        }
        const city = await tx.city.create({
          data: {
            name: pending.proposedName,
            provinceId: province.id,
            countryId: province.countryId
          }
        });
        createdId = city.id;
      } else {
        if (!pending.parentId) {
          throw new BadRequestException('Suburb pending geo requires a cityId parent');
        }
        const city = await tx.city.findUnique({
          where: { id: pending.parentId },
          include: { province: true }
        });
        if (!city) {
          throw new BadRequestException('Parent city not found');
        }
        const suburb = await tx.suburb.create({
          data: {
            name: pending.proposedName,
            cityId: city.id,
            provinceId: city.provinceId,
            countryId: city.countryId
          }
        });
        createdId = suburb.id;
      }

      await tx.pendingGeo.update({
        where: { id },
        data: {
          status: PendingGeoStatus.APPROVED,
          mergedIntoId: createdId
        }
      });

      await this.syncPropertiesForApproval(
        pending.level,
        id,
        createdId,
        pending.parentId ?? null,
        tx
      );

      return createdId;
    });

    return { id: result };
  }

  async mergePending(id: string, targetId: string) {
    const pending = await this.prisma.pendingGeo.findUnique({ where: { id } });
    if (!pending) {
      throw new NotFoundException('Pending geo not found');
    }

    if (pending.status !== PendingGeoStatus.PENDING) {
      throw new BadRequestException('Pending geo is not awaiting approval');
    }

    const parentId = await this.validateMergeTarget(pending.level, targetId, pending.parentId);

    await this.prisma.$transaction(async (tx) => {
      await tx.pendingGeo.update({
        where: { id },
        data: {
          status: PendingGeoStatus.APPROVED,
          mergedIntoId: targetId
        }
      });

      await this.syncPropertiesForApproval(pending.level, id, targetId, parentId, tx);
    });

    return { id: targetId };
  }

  async rejectPending(id: string) {
    const pending = await this.prisma.pendingGeo.findUnique({ where: { id } });
    if (!pending) {
      throw new NotFoundException('Pending geo not found');
    }

    if (pending.status !== PendingGeoStatus.PENDING) {
      throw new BadRequestException('Pending geo is not awaiting approval');
    }

    await this.prisma.pendingGeo.update({
      where: { id },
      data: { status: PendingGeoStatus.REJECTED }
    });
  }

  async resolveLocation(input: LocationInput): Promise<ResolvedLocation> {
    const { countryId, provinceId, cityId, suburbId, pendingGeoId } = input;

    let pendingGeo: PendingGeo | null = null;
    let pendingCountry: Country | null = null;
    let pendingProvince: Province | null = null;
    let pendingCity: City | null = null;
    if (pendingGeoId) {
      pendingGeo = await this.prisma.pendingGeo.findUnique({ where: { id: pendingGeoId } });
      if (!pendingGeo || pendingGeo.status !== PendingGeoStatus.PENDING) {
        throw new BadRequestException('Invalid pendingGeoId');
      }

       if (pendingGeo.level === GeoLevel.PROVINCE) {
        if (!pendingGeo.parentId) {
          throw new BadRequestException('Pending province requires a country parent');
        }
        pendingCountry = await this.prisma.country.findUnique({ where: { id: pendingGeo.parentId } });
        if (!pendingCountry) {
          throw new BadRequestException('Parent country not found');
        }
      } else if (pendingGeo.level === GeoLevel.CITY) {
        if (!pendingGeo.parentId) {
          throw new BadRequestException('Pending city requires a province parent');
        }
        pendingProvince = await this.prisma.province.findUnique({
          where: { id: pendingGeo.parentId },
          include: { country: true }
        });
        if (!pendingProvince) {
          throw new BadRequestException('Parent province not found');
        }
        pendingCountry = pendingProvince.country;
      } else if (pendingGeo.level === GeoLevel.SUBURB) {
        if (!pendingGeo.parentId) {
          throw new BadRequestException('Pending suburb requires a city parent');
        }
        pendingCity = await this.prisma.city.findUnique({
          where: { id: pendingGeo.parentId },
          include: { province: { include: { country: true } }, country: true }
        });
        if (!pendingCity) {
          throw new BadRequestException('Parent city not found');
        }
        pendingProvince = pendingCity.province;
        pendingCountry = pendingCity.country;
      }
    }

    let suburb: (Suburb & {
      city: City & { province: Province; country: Country };
      province: Province;
      country: Country;
    }) | null = null;
    if (suburbId) {
      suburb = await this.prisma.suburb.findUnique({
        where: { id: suburbId },
        include: { city: { include: { province: { include: { country: true } }, country: true } }, province: true, country: true }
      });
      if (!suburb) {
        throw new BadRequestException('Suburb not found');
      }
    }

    let city: (City & { province: Province & { country: Country }; country: Country }) | null = null;
    if (suburb) {
      city = suburb.city;
    } else if (cityId) {
      city = await this.prisma.city.findUnique({
        where: { id: cityId },
        include: { province: { include: { country: true } }, country: true }
      });
      if (!city) {
        throw new BadRequestException('City not found');
      }
    } else if (pendingCity) {
      city = pendingCity;
    }

    let province: (Province & { country: Country }) | null = null;
    if (city) {
      province = await this.prisma.province.findUnique({
        where: { id: city.provinceId },
        include: { country: true }
      });
    } else if (suburb) {
      province = await this.prisma.province.findUnique({
        where: { id: suburb.provinceId },
        include: { country: true }
      });
    } else if (provinceId) {
      province = await this.prisma.province.findUnique({
        where: { id: provinceId },
        include: { country: true }
      });
      if (!province) {
        throw new BadRequestException('Province not found');
      }
    } else if (pendingProvince) {
      province = pendingProvince;
    }

    let country: Country | null = null;
    if (province) {
      country = await this.prisma.country.findUnique({ where: { id: province.countryId } });
    } else if (city) {
      country = await this.prisma.country.findUnique({ where: { id: city.countryId } });
    } else if (suburb) {
      country = await this.prisma.country.findUnique({ where: { id: suburb.countryId } });
    } else if (countryId) {
      country = await this.prisma.country.findUnique({ where: { id: countryId } });
      if (!country) {
        throw new BadRequestException('Country not found');
      }
    } else if (pendingCountry) {
      country = pendingCountry;
    }

    if (countryId && country && country.id !== countryId) {
      throw new BadRequestException('countryId does not match derived hierarchy');
    }
    if (provinceId && province && province.id !== provinceId) {
      throw new BadRequestException('provinceId does not match derived hierarchy');
    }
    if (cityId && city && city.id !== cityId) {
      throw new BadRequestException('cityId does not match derived hierarchy');
    }
    if (suburbId && suburb && suburb.id !== suburbId) {
      throw new BadRequestException('suburbId does not match derived hierarchy');
    }

    if (!country && !pendingGeo) {
      throw new BadRequestException('countryId is required when no pending geo is supplied');
    }

    if (pendingGeo) {
      await this.assertParentExists(pendingGeo.level, pendingGeo.parentId);
    }

    return {
      country: country ?? null,
      province: province ?? null,
      city: city ?? null,
      suburb: suburb ?? null,
      pendingGeo
    };
  }

  private async ensureSeedData() {
    const existing = await this.prisma.country.findFirst({ where: { iso2: ZIMBABWE_SEED.iso2 } });
    if (existing) {
      return;
    }

    const country = await this.prisma.country.create({
      data: {
        iso2: ZIMBABWE_SEED.iso2,
        name: ZIMBABWE_SEED.name,
        phoneCode: ZIMBABWE_SEED.phoneCode
      }
    });

    for (const provinceSeed of ZIMBABWE_SEED.provinces) {
      const province = await this.prisma.province.create({
        data: {
          name: provinceSeed.name,
          countryId: country.id
        }
      });

      for (const citySeed of provinceSeed.cities) {
        const city = await this.prisma.city.create({
          data: {
            name: citySeed.name,
            provinceId: province.id,
            countryId: country.id,
            lat: citySeed.lat ?? null,
            lng: citySeed.lng ?? null
          }
        });

        for (const suburbSeed of citySeed.suburbs ?? []) {
          await this.prisma.suburb.create({
            data: {
              name: suburbSeed.name,
              cityId: city.id,
              provinceId: province.id,
              countryId: country.id,
              lat: suburbSeed.lat ?? null,
              lng: suburbSeed.lng ?? null,
              polygonGeoJson: suburbSeed.polygonGeoJson ?? null
            }
          });
        }
      }
    }
  }

  private async ensureCountryExists(countryId: string) {
    const exists = await this.prisma.country.count({ where: { id: countryId } });
    if (!exists) {
      throw new BadRequestException('Country not found');
    }
  }

  private async ensureProvinceExists(provinceId: string) {
    const exists = await this.prisma.province.count({ where: { id: provinceId } });
    if (!exists) {
      throw new BadRequestException('Province not found');
    }
  }

  private async ensureCityExists(cityId: string) {
    const exists = await this.prisma.city.count({ where: { id: cityId } });
    if (!exists) {
      throw new BadRequestException('City not found');
    }
  }

  private async assertParentExists(level: GeoLevel, parentId?: string | null) {
    if (level === GeoLevel.COUNTRY) {
      return;
    }

    if (!parentId) {
      throw new BadRequestException('Parent id is required');
    }

    if (level === GeoLevel.PROVINCE) {
      await this.ensureCountryExists(parentId);
      return;
    }

    if (level === GeoLevel.CITY) {
      await this.ensureProvinceExists(parentId);
      return;
    }

    await this.ensureCityExists(parentId);
  }

  private async ensureNotDuplicate(level: GeoLevel, name: string, parentId?: string) {
    const normalized = name.trim();
    if (!normalized) {
      return;
    }

    if (level === GeoLevel.COUNTRY) {
      const exists = await this.prisma.country.count({
        where: { name: { equals: normalized, mode: 'insensitive' } }
      });
      if (exists) {
        throw new BadRequestException('Country already exists');
      }
    } else if (level === GeoLevel.PROVINCE) {
      const exists = await this.prisma.province.count({
        where: {
          name: { equals: normalized, mode: 'insensitive' },
          countryId: parentId
        }
      });
      if (exists) {
        throw new BadRequestException('Province already exists');
      }
    } else if (level === GeoLevel.CITY) {
      const exists = await this.prisma.city.count({
        where: {
          name: { equals: normalized, mode: 'insensitive' },
          provinceId: parentId
        }
      });
      if (exists) {
        throw new BadRequestException('City already exists');
      }
    } else {
      const exists = await this.prisma.suburb.count({
        where: {
          name: { equals: normalized, mode: 'insensitive' },
          cityId: parentId
        }
      });
      if (exists) {
        throw new BadRequestException('Suburb already exists');
      }
    }
  }

  private async validateMergeTarget(
    level: GeoLevel,
    targetId: string,
    pendingParentId: string | null
  ): Promise<string | null> {
    if (level === GeoLevel.COUNTRY) {
      const country = await this.prisma.country.findUnique({ where: { id: targetId } });
      if (!country) {
        throw new BadRequestException('Target country not found');
      }
      return null;
    }

    if (!pendingParentId) {
      pendingParentId = null;
    }

    if (level === GeoLevel.PROVINCE) {
      const province = await this.prisma.province.findUnique({ where: { id: targetId } });
      if (!province) {
        throw new BadRequestException('Target province not found');
      }
      if (pendingParentId && province.countryId !== pendingParentId) {
        throw new BadRequestException('Target province belongs to a different country');
      }
      return province.countryId;
    }

    if (level === GeoLevel.CITY) {
      const city = await this.prisma.city.findUnique({ where: { id: targetId } });
      if (!city) {
        throw new BadRequestException('Target city not found');
      }
      if (pendingParentId && city.provinceId !== pendingParentId) {
        throw new BadRequestException('Target city belongs to a different province');
      }
      return city.provinceId;
    }

    const suburb = await this.prisma.suburb.findUnique({ where: { id: targetId } });
    if (!suburb) {
      throw new BadRequestException('Target suburb not found');
    }
    if (pendingParentId && suburb.cityId !== pendingParentId) {
      throw new BadRequestException('Target suburb belongs to a different city');
    }
    return suburb.cityId;
  }

  private async syncPropertiesForApproval(
    level: GeoLevel,
    pendingId: string,
    locationId: string,
    parentId: string | null,
    tx: Prisma.TransactionClient
  ) {
    if (level === GeoLevel.COUNTRY) {
      await tx.property.updateMany({
        where: { pendingGeoId: pendingId },
        data: { countryId: locationId, pendingGeoId: null }
      });
      return;
    }

    if (!parentId) {
      throw new BadRequestException('Parent id required for pending geo linkage');
    }

    if (level === GeoLevel.PROVINCE) {
      await tx.property.updateMany({
        where: { pendingGeoId: pendingId },
        data: { provinceId: locationId, countryId: parentId, pendingGeoId: null }
      });
      return;
    }

    if (level === GeoLevel.CITY) {
      await tx.property.updateMany({
        where: { pendingGeoId: pendingId },
        data: {
          cityId: locationId,
          provinceId: parentId,
          countryId: await this.resolveCountryIdForProvince(parentId, tx),
          pendingGeoId: null
        }
      });
      return;
    }

    const city = await tx.city.findUnique({
      where: { id: parentId },
      include: { province: true }
    });
    if (!city) {
      throw new NotFoundException('Parent city not found');
    }

    await tx.property.updateMany({
      where: { pendingGeoId: pendingId },
      data: {
        suburbId: locationId,
        cityId: city.id,
        provinceId: city.provinceId,
        countryId: city.countryId,
        pendingGeoId: null
      }
    });
  }

  private async resolveCountryIdForProvince(
    provinceId: string,
    tx: Prisma.TransactionClient
  ) {
    const province = await tx.province.findUnique({ where: { id: provinceId } });
    if (!province) {
      throw new NotFoundException('Province not found');
    }
    return province.countryId;
  }
}
