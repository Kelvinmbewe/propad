import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { calculateTrustScore } from "./trust-score";
import {
  KycStatus,
  ListingIntent,
  PropertyStatus,
  VerificationLevel,
} from "@prisma/client";
import { createHmac, timingSafeEqual } from "crypto";
import { existsSync } from "fs";
import { join, resolve } from "path";
import { GetCompanyListingsDto } from "./dto/get-company-listings.dto";
import { GetPublicCompaniesDto } from "./dto/get-public-companies.dto";

export interface AuthContext {
  userId: string;
  role: string;
  email?: string | null;
}

@Injectable()
export class CompaniesService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  private resolveUploadsRoot() {
    const runtimeCwd = process.env.INIT_CWD ?? process.env.PWD ?? ".";
    const candidates = [
      process.env.UPLOADS_DIR,
      resolve(runtimeCwd, "uploads"),
      resolve(runtimeCwd, "apps", "api", "uploads"),
      resolve(runtimeCwd, "..", "uploads"),
      resolve(runtimeCwd, "..", "..", "uploads"),
    ].filter((value): value is string => !!value);

    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        return candidate;
      }
    }

    return resolve(runtimeCwd, "uploads");
  }

  private getDistanceKm(
    a: { lat: number; lng: number },
    b: { lat: number; lng: number },
  ) {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const earthRadius = 6371;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const sinLat = Math.sin(dLat / 2) ** 2;
    const sinLng = Math.sin(dLng / 2) ** 2;
    const c =
      2 *
      Math.asin(Math.sqrt(sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng));
    return earthRadius * c;
  }

  private async ensureCompanyForAgency(id: string) {
    let company = await this.prisma.company.findUnique({ where: { id } });
    if (!company) {
      company = await this.prisma.company.findUnique({ where: { slug: id } });
    }

    let agency = company?.agencyId
      ? await this.prisma.agency.findUnique({ where: { id: company.agencyId } })
      : null;

    if (!agency) {
      agency = await this.prisma.agency.findUnique({ where: { id } });
    }

    if (!agency) {
      agency = await this.prisma.agency.findUnique({ where: { slug: id } });
    }

    if (!agency) {
      throw new NotFoundException("Company not found");
    }

    if (!company) {
      company = await this.prisma.company.findFirst({
        where: { agencyId: agency.id },
      });
    }

    if (!company) {
      company = await this.prisma.company.create({
        data: {
          agencyId: agency.id,
          name: agency.name,
          slug: agency.slug ?? undefined,
          logoUrl: agency.logoUrl ?? undefined,
          shortDescription: agency.shortDescription ?? undefined,
          description: agency.description ?? agency.bio ?? undefined,
          servicesJson: agency.servicesOffered
            ? { items: [agency.servicesOffered] }
            : undefined,
        },
      });
    }

    return { agency, company };
  }

  private async buildPublicCompany(agency: any, company: any) {
    const listings = await this.prisma.property.findMany({
      where: {
        agencyId: agency.id,
        status: { in: ["PUBLISHED", "VERIFIED"] },
      },
      include: {
        province: { select: { name: true } },
        city: { select: { name: true } },
        suburb: { select: { name: true } },
        media: { take: 1, orderBy: { order: "asc" } },
      },
      take: 6,
      orderBy: { createdAt: "desc" },
    });

    const reviews = await this.prisma.agencyReview.findMany({
      where: { agencyId: agency.id },
      include: { reviewer: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 6,
    });

    const ratingAvg =
      reviews.length > 0
        ? reviews.reduce((sum, review) => sum + review.rating, 0) /
          reviews.length
        : 0;

    const verifiedTransactions = await this.prisma.property.count({
      where: {
        agencyId: agency.id,
        dealConfirmedAt: { not: null },
      },
    });

    const yearsActive = Math.max(
      0,
      new Date().getFullYear() - new Date(agency.createdAt).getFullYear(),
    );

    const companyKyc = await this.prisma.companyKyc.findFirst({
      where: { companyId: company.id },
    });

    const verifiedDocs = await this.prisma.document.count({
      where: { companyId: company.id, status: "VERIFIED" },
    });

    const trust = calculateTrustScore({
      kycStatus: (companyKyc?.status ?? KycStatus.PENDING) as any,
      docVerifiedCount: verifiedDocs,
      docRequiredCount: 3,
      verifiedEmail: Boolean(agency.email),
      verifiedPhone: Boolean(agency.phone),
      yearsActive,
      verifiedTransactions,
      avgRating: ratingAvg,
      reviewCount: reviews.length,
      complaintResolutionRate: 0.85,
    });

    const locationSeed = listings.find(
      (listing) =>
        listing.city?.name ||
        listing.province?.name ||
        listing.lat ||
        listing.lng,
    );

    const categories = Array.from(
      new Set(
        listings.map((listing) =>
          listing.listingIntent === ListingIntent.TO_RENT
            ? "LETTINGS"
            : "SALES",
        ),
      ),
    );

    const socialLinks = company.socialLinksJson ?? null;

    return {
      id: company.id,
      agencyId: agency.id,
      name: company.name ?? agency.name,
      slug: company.slug,
      logoUrl: company.logoUrl ?? agency.logoUrl,
      coverUrl: company.coverUrl,
      shortDescription: company.shortDescription ?? agency.shortDescription,
      description: company.description ?? agency.description ?? agency.bio,
      phone: agency.phone ?? null,
      email: agency.email ?? null,
      address: agency.address ?? null,
      city: locationSeed?.city?.name ?? null,
      province: locationSeed?.province?.name ?? null,
      lat: locationSeed?.lat ?? null,
      lng: locationSeed?.lng ?? null,
      website:
        typeof socialLinks?.website === "string" ? socialLinks.website : null,
      categories,
      createdAt: company.createdAt,
      isVerified: Boolean(agency.verifiedAt),
      services: company.servicesJson ?? agency.servicesOffered,
      areasServed: company.areasServedJson,
      hours: company.hoursJson,
      languages: company.languagesJson,
      socialLinks,
      stats: {
        listingsCount: listings.length,
        reviewsCount: reviews.length,
        avgRating: Number(ratingAvg.toFixed(1)),
        verifiedTransactions,
        yearsActive,
        responseTimeMinutes: company.responseTimeMinutes,
      },
      trust,
      listings: listings.map((listing) => ({
        id: listing.id,
        title: listing.title,
        price: listing.price,
        currency: listing.currency,
        bedrooms: listing.bedrooms,
        bathrooms: listing.bathrooms,
        city: listing.city?.name,
        suburb: listing.suburb?.name,
        imageUrl: listing.media[0]?.url ?? null,
      })),
      reviews: reviews.map((review) => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        author: review.reviewer?.name ?? "Anonymous",
        createdAt: review.createdAt,
      })),
      team: agency.members?.map((member: any) => ({
        id: member.userId,
        name: member.user?.name ?? "Unnamed Agent",
        profilePhoto: member.user?.profilePhoto ?? null,
      })),
    };
  }

  async getPublicCompany(companyId: string) {
    const { agency, company } = await this.ensureCompanyForAgency(companyId);
    const agencyWithMembers = await this.prisma.agency.findUnique({
      where: { id: agency.id },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, profilePhoto: true } },
          },
        },
      },
    });
    return this.buildPublicCompany(agencyWithMembers ?? agency, company);
  }

  async getCompanySummary(companyId: string) {
    return this.getPublicCompany(companyId);
  }

  async getPublicCompanies(query: GetPublicCompaniesDto) {
    const centerLat =
      typeof query.lat === "number" && Number.isFinite(query.lat)
        ? query.lat
        : -17.8252;
    const centerLng =
      typeof query.lng === "number" && Number.isFinite(query.lng)
        ? query.lng
        : 31.0335;
    const hasCoords =
      typeof query.lat === "number" &&
      Number.isFinite(query.lat) &&
      typeof query.lng === "number" &&
      Number.isFinite(query.lng);
    const radiusKm = Math.min(500, Math.max(1, query.radiusKm ?? 150));
    const minTrust = Math.min(100, Math.max(0, query.minTrust ?? 35));
    const minRating = Math.min(5, Math.max(0, query.minRating ?? 3));
    const take = Math.min(30, Math.max(1, query.take ?? 12));
    const verifiedOnly = query.verifiedOnly ?? true;
    const sort = query.sort ?? "RECOMMENDED";
    const cursorOffset = Math.max(0, Number(query.cursor ?? 0) || 0);
    const q = query.q?.trim() ?? "";

    const listingWhere: any = {
      status: { in: [PropertyStatus.PUBLISHED, PropertyStatus.VERIFIED] },
      agencyId: { not: null },
    };

    if (query.service === "LETTINGS") {
      listingWhere.listingIntent = ListingIntent.TO_RENT;
    } else if (query.service === "SALES") {
      listingWhere.listingIntent = { not: ListingIntent.TO_RENT };
    }

    if (query.province?.trim()) {
      listingWhere.province = {
        name: { contains: query.province.trim(), mode: "insensitive" },
      };
    }

    if (hasCoords) {
      const dLat = radiusKm / 111;
      const dLng =
        radiusKm /
        (111 * Math.max(0.05, Math.cos((centerLat * Math.PI) / 180)));
      listingWhere.lat = { gte: centerLat - dLat, lte: centerLat + dLat };
      listingWhere.lng = { gte: centerLng - dLng, lte: centerLng + dLng };
    }

    const agencies = await this.prisma.agency.findMany({
      where: {
        ...(verifiedOnly
          ? {
              OR: [{ verifiedAt: { not: null } }, { trustScore: { gte: 70 } }],
            }
          : {}),
        properties: { some: listingWhere },
      },
      include: {
        companyProfile: true,
        reviews: {
          select: { rating: true },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                profilePhoto: true,
              },
            },
          },
          take: 3,
        },
        properties: {
          where: listingWhere,
          select: {
            id: true,
            title: true,
            listingIntent: true,
            verificationLevel: true,
            trustScore: true,
            lat: true,
            lng: true,
            city: { select: { name: true } },
            suburb: { select: { name: true } },
            province: { select: { name: true } },
          },
        },
      },
      take: 300,
    });

    const normalized = agencies
      .map((agency) => {
        const listings = agency.properties ?? [];
        if (!listings.length) return null;

        const locationMatches = listings.some((listing) => {
          if (!q) return true;
          const locationText = [
            listing.suburb?.name,
            listing.city?.name,
            listing.province?.name,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return locationText.includes(q.toLowerCase());
        });
        const agencyNameMatches =
          !q || agency.name.toLowerCase().includes(q.toLowerCase());
        if (!locationMatches && !agencyNameMatches) {
          return null;
        }

        const coordinates = listings.filter(
          (listing) =>
            typeof listing.lat === "number" && typeof listing.lng === "number",
        );
        const centroid = coordinates.length
          ? {
              lat:
                coordinates.reduce(
                  (sum, listing) => sum + Number(listing.lat),
                  0,
                ) / coordinates.length,
              lng:
                coordinates.reduce(
                  (sum, listing) => sum + Number(listing.lng),
                  0,
                ) / coordinates.length,
            }
          : null;

        const distanceKm =
          hasCoords && centroid
            ? this.getDistanceKm(
                { lat: centerLat, lng: centerLng },
                { lat: centroid.lat, lng: centroid.lng },
              )
            : null;

        if (hasCoords && distanceKm != null && distanceKm > radiusKm) {
          return null;
        }

        const verifiedListingsCount = listings.filter(
          (listing) =>
            listing.verificationLevel === VerificationLevel.VERIFIED ||
            listing.verificationLevel === VerificationLevel.TRUSTED ||
            Number(listing.trustScore ?? 0) >= 70,
        ).length;

        const forSaleCount = listings.filter(
          (listing) => listing.listingIntent !== ListingIntent.TO_RENT,
        ).length;
        const toRentCount = listings.filter(
          (listing) => listing.listingIntent === ListingIntent.TO_RENT,
        ).length;

        const listingTrustAverage =
          listings.reduce(
            (sum, listing) => sum + Number(listing.trustScore ?? 0),
            0,
          ) / listings.length;
        const reviewsCount =
          agency.companyProfile?.reviewsCount ?? agency.reviews.length;
        const reviewsAvgRaw =
          agency.companyProfile?.avgRating &&
          agency.companyProfile.avgRating > 0
            ? agency.companyProfile.avgRating
            : agency.reviews.length
              ? agency.reviews.reduce((sum, review) => sum + review.rating, 0) /
                agency.reviews.length
              : null;

        if (reviewsAvgRaw != null && reviewsAvgRaw < minRating) {
          return null;
        }

        const bucket =
          verifiedListingsCount >= 40
            ? 30
            : verifiedListingsCount >= 20
              ? 20
              : verifiedListingsCount >= 10
                ? 12
                : verifiedListingsCount >= 5
                  ? 8
                  : verifiedListingsCount > 0
                    ? 4
                    : 0;

        const computedTrust = Math.max(
          0,
          Math.min(
            100,
            Math.round(
              listingTrustAverage * 0.6 +
                (agency.verifiedAt ? 20 : 0) +
                ((reviewsAvgRaw ?? 0) * 10 + bucket),
            ),
          ),
        );

        const trust = Math.max(
          Number(agency.trustScore ?? 0),
          Number(agency.companyProfile?.trustScore ?? 0),
          computedTrust,
        );

        if (trust < minTrust) return null;

        if (
          verifiedOnly &&
          !agency.verifiedAt &&
          verifiedListingsCount === 0 &&
          trust < 70
        ) {
          return null;
        }

        const proximityBonus =
          distanceKm == null ? 0 : Math.max(0, 100 - Math.min(100, distanceKm));
        const ratingNormalized = (reviewsAvgRaw ?? 0) * 20;
        const verifiedBucketScore = Math.min(100, verifiedListingsCount * 4);
        const recommendedScore =
          trust * 0.55 +
          ratingNormalized * 0.2 +
          verifiedBucketScore * 0.15 +
          proximityBonus * 0.1;

        const areaCounts = new Map<string, number>();
        for (const listing of listings) {
          const key =
            listing.suburb?.name ||
            listing.city?.name ||
            listing.province?.name;
          if (!key) continue;
          areaCounts.set(key, (areaCounts.get(key) ?? 0) + 1);
        }
        const topAreas = Array.from(areaCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 4)
          .map(([name]) => name);

        return {
          id: agency.id,
          slug: agency.slug,
          name: agency.name,
          logoUrl: agency.logoUrl,
          phone: agency.phone,
          verified: Boolean(agency.verifiedAt),
          trustScore: trust,
          ratingAvg: reviewsAvgRaw,
          reviewsCount,
          location: {
            suburb: listings[0]?.suburb?.name ?? null,
            city: listings[0]?.city?.name ?? null,
            province: listings[0]?.province?.name ?? null,
            lat: centroid?.lat ?? null,
            lng: centroid?.lng ?? null,
            distanceKm,
          },
          stats: {
            activeListingsCount: listings.length,
            verifiedListingsCount,
            forSaleCount,
            toRentCount,
          },
          team: {
            count: agency.members.length,
            top: agency.members.map((member) => ({
              id: member.user.id,
              name: member.user.name ?? "Agent",
              profilePhoto: member.user.profilePhoto,
            })),
          },
          topAreas,
          score: {
            recommended: recommendedScore,
            proximityBonus,
          },
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    normalized.sort((a, b) => {
      if (sort === "TRUST") return b.trustScore - a.trustScore;
      if (sort === "RATING") return (b.ratingAvg ?? -1) - (a.ratingAvg ?? -1);
      if (sort === "MOST_LISTINGS") {
        return b.stats.activeListingsCount - a.stats.activeListingsCount;
      }
      if (sort === "NEAREST") {
        const distanceA = a.location.distanceKm ?? Number.POSITIVE_INFINITY;
        const distanceB = b.location.distanceKm ?? Number.POSITIVE_INFINITY;
        return distanceA - distanceB;
      }
      return b.score.recommended - a.score.recommended;
    });

    const paged = normalized.slice(cursorOffset, cursorOffset + take);
    const nextCursor =
      cursorOffset + take < normalized.length
        ? String(cursorOffset + take)
        : null;

    const areas = new Map<string, number>();
    for (const agency of normalized) {
      for (const area of agency.topAreas) {
        areas.set(area, (areas.get(area) ?? 0) + 1);
      }
    }

    return {
      items: paged,
      nextCursor,
      popularAreas: Array.from(areas.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, count]) => ({ name, count })),
      meta: {
        center: { lat: centerLat, lng: centerLng },
        radiusKm,
        totals: {
          agenciesNearYou: normalized.length,
          verifiedAgencies: normalized.filter((item) => item.verified).length,
          verifiedListings: normalized.reduce(
            (sum, item) => sum + item.stats.verifiedListingsCount,
            0,
          ),
          avgTrust:
            normalized.length > 0
              ? normalized.reduce((sum, item) => sum + item.trustScore, 0) /
                normalized.length
              : 0,
        },
      },
    };
  }

  async getPublicCompanyListings(
    companyId: string,
    query: GetCompanyListingsDto,
  ) {
    const { agency } = await this.ensureCompanyForAgency(companyId);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 12;
    const verifiedOnly = query.verifiedOnly ?? true;

    const where: any = {
      agencyId: agency.id,
      status: { in: [PropertyStatus.PUBLISHED, PropertyStatus.VERIFIED] },
    };
    if (query.intent) {
      where.listingIntent = query.intent;
    }
    if (verifiedOnly) {
      where.verificationLevel = {
        in: [VerificationLevel.VERIFIED, VerificationLevel.TRUSTED],
      };
    }

    const orderBy =
      query.sort === "PRICE_ASC"
        ? { price: "asc" as const }
        : query.sort === "PRICE_DESC"
          ? { price: "desc" as const }
          : query.sort === "TRUST"
            ? { trustScore: "desc" as const }
            : { createdAt: "desc" as const };

    const [items, total, allActive] = await Promise.all([
      this.prisma.property.findMany({
        where,
        include: {
          city: { select: { name: true } },
          suburb: { select: { name: true } },
          province: { select: { name: true } },
          media: { take: 1, orderBy: { order: "asc" } },
        },
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.property.count({ where }),
      this.prisma.property.findMany({
        where: {
          agencyId: agency.id,
          status: { in: [PropertyStatus.PUBLISHED, PropertyStatus.VERIFIED] },
        },
        select: {
          id: true,
          price: true,
          listingIntent: true,
          createdAt: true,
          verificationLevel: true,
        },
      }),
    ]);

    const now = Date.now();
    const sale = allActive
      .filter((item) => item.listingIntent !== ListingIntent.TO_RENT)
      .map((item) => Number(item.price ?? 0))
      .filter((price) => Number.isFinite(price) && price > 0);
    const rent = allActive
      .filter((item) => item.listingIntent === ListingIntent.TO_RENT)
      .map((item) => Number(item.price ?? 0))
      .filter((price) => Number.isFinite(price) && price > 0);
    const avg = (values: number[]) =>
      values.length
        ? values.reduce((sum, value) => sum + value, 0) / values.length
        : null;

    return {
      items: items.map((listing) => ({
        id: listing.id,
        title: listing.title,
        price: Number(listing.price ?? 0),
        currency: listing.currency,
        listingIntent: listing.listingIntent,
        bedrooms: listing.bedrooms,
        bathrooms: listing.bathrooms,
        areaSqm: listing.areaSqm,
        status: listing.status,
        verificationLevel: listing.verificationLevel,
        trustScore: listing.trustScore ?? listing.verificationScore ?? 0,
        imageUrl: listing.media[0]?.url ?? null,
        createdAt: listing.createdAt,
        locationText: [
          listing.suburb?.name,
          listing.city?.name,
          listing.province?.name,
        ]
          .filter(Boolean)
          .join(", "),
      })),
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
      stats: {
        activeListingsCount: allActive.length,
        verifiedListingsCount: allActive.filter(
          (item) =>
            item.verificationLevel === VerificationLevel.VERIFIED ||
            item.verificationLevel === VerificationLevel.TRUSTED,
        ).length,
        listingsLast30DaysCount: allActive.filter((item) => {
          const createdAt = new Date(item.createdAt).getTime();
          return now - createdAt <= 30 * 24 * 60 * 60 * 1000;
        }).length,
        avgSalePrice: avg(sale),
        avgRentPrice: avg(rent),
      },
    };
  }

  async getAdminKyc(companyId: string) {
    const { company } = await this.ensureCompanyForAgency(companyId);
    const kyc = await this.prisma.companyKyc.findFirst({
      where: { companyId: company.id },
      include: {
        identity: true,
        ubos: true,
        documents: true,
        reviewer: { select: { id: true, name: true, email: true } },
      },
    });

    const documents =
      kyc?.documents.map((doc: any) => ({
        ...doc,
        signedUrl: this.generateSignedDocumentUrl(doc.id).url,
      })) ?? [];

    const auditLogs = await this.prisma.auditLog.findMany({
      where: {
        targetType: { in: ["companyKyc", "document"] },
        targetId: kyc?.id ?? undefined,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return { company, kyc: kyc ? { ...kyc, documents } : null, auditLogs };
  }

  async applyKycAction(
    companyId: string,
    action: "approve" | "reject" | "request_info" | "suspend",
    actor: AuthContext,
    notes?: string,
  ) {
    const { company } = await this.ensureCompanyForAgency(companyId);
    const kyc = await this.prisma.companyKyc.upsert({
      where: { companyId: company.id },
      update: {},
      create: { companyId: company.id },
    });

    const statusMap: Record<typeof action, KycStatus> = {
      approve: KycStatus.VERIFIED,
      reject: KycStatus.REJECTED,
      request_info: KycStatus.PENDING,
      suspend: KycStatus.REJECTED,
    };

    const updated = await this.prisma.companyKyc.update({
      where: { id: kyc.id },
      data: {
        status: statusMap[action],
        reviewerId: actor.userId,
        reviewedAt: action === "request_info" ? null : new Date(),
        requestedAt: action === "request_info" ? new Date() : kyc.requestedAt,
        notes: notes ?? undefined,
      },
    });

    await this.audit.logAction({
      action: "company.kyc.action",
      actorId: actor.userId,
      targetType: "companyKyc",
      targetId: updated.id,
      metadata: { action, notes },
    });

    return updated;
  }

  async verifyDocument(
    documentId: string,
    status: "VERIFIED" | "REJECTED",
    actor: AuthContext,
    notes?: string,
  ) {
    const updated = await this.prisma.document.update({
      where: { id: documentId },
      data: {
        status: status === "VERIFIED" ? "VERIFIED" : "REJECTED",
        verifiedById: actor.userId,
        verifiedAt: new Date(),
        extractedFields: notes ? { notes } : undefined,
      },
    });

    await this.audit.logAction({
      action: "company.document.verify",
      actorId: actor.userId,
      targetType: "document",
      targetId: updated.id,
      metadata: { status, notes },
    });

    return updated;
  }

  generateSignedDocumentUrl(documentId: string, expiresInSeconds = 300) {
    const secret =
      process.env.DOCUMENT_SIGNING_SECRET ?? "propad-dev-document-secret";
    const expiresAt = Date.now() + expiresInSeconds * 1000;
    const payload = `${documentId}:${expiresAt}`;
    const signature = createHmac("sha256", secret)
      .update(payload)
      .digest("hex");
    return {
      url: `/v1/admin/documents/${documentId}/file?expires=${expiresAt}&signature=${signature}`,
      expiresAt,
    };
  }

  verifySignedDocumentToken(
    documentId: string,
    expires: string,
    signature: string,
  ) {
    const secret =
      process.env.DOCUMENT_SIGNING_SECRET ?? "propad-dev-document-secret";
    const expiresAt = Number(expires);
    if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) {
      throw new BadRequestException("Signed URL expired");
    }
    const payload = `${documentId}:${expiresAt}`;
    const expected = createHmac("sha256", secret).update(payload).digest("hex");
    const sigBytes = Buffer.from(signature);
    const expBytes = Buffer.from(expected);
    const sigLength = (sigBytes as any).length;
    const expLength = (expBytes as any).length;
    if (sigLength !== expLength) {
      throw new BadRequestException("Invalid signature");
    }
    const valid = timingSafeEqual(
      sigBytes as unknown as Uint8Array,
      expBytes as unknown as Uint8Array,
    );
    if (!valid) {
      throw new BadRequestException("Invalid signature");
    }
  }

  async getDocumentFile(documentId: string) {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });
    if (!document) {
      throw new NotFoundException("Document not found");
    }

    const uploadsRoot = this.resolveUploadsRoot();
    const filePath = join(uploadsRoot, document.storagePath);
    if (!existsSync(filePath)) {
      throw new NotFoundException("Document file missing");
    }

    return { filePath };
  }
}
