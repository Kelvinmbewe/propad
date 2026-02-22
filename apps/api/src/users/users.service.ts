import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { calculateUserTrustScore } from "./trust-score";
import {
  KycStatus,
  ListingIntent,
  PropertyStatus,
  VerificationLevel,
} from "@prisma/client";
import { createHmac, timingSafeEqual } from "crypto";
import { existsSync } from "fs";
import { join, resolve } from "path";
import { GetUserListingsDto } from "./dto/get-user-listings.dto";

export interface AuthContext {
  userId: string;
  role: string;
  email?: string | null;
}

@Injectable()
export class UsersService {
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

  private mapTrustTier(score: number) {
    if (score >= 85) return "Elite";
    if (score >= 70) return "Trusted";
    if (score >= 50) return "Standard";
    return "Basic";
  }

  async getPublicUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        agencyMemberships: {
          include: {
            agency: { select: { id: true, name: true, logoUrl: true } },
          },
        },
        reviewsReceived: {
          take: 6,
          orderBy: { createdAt: "desc" },
          include: { reviewer: { select: { name: true } } },
        },
      },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const listings = await this.prisma.property.findMany({
      where: {
        OR: [{ agentOwnerId: user.id }, { landlordId: user.id }],
        status: { in: ["PUBLISHED", "VERIFIED"] },
      },
      include: {
        city: { select: { name: true } },
        suburb: { select: { name: true } },
        media: { take: 1, orderBy: { order: "asc" } },
      },
      take: 6,
      orderBy: { createdAt: "desc" },
    });

    const reviewAvg =
      user.reviewsReceived.length > 0
        ? user.reviewsReceived.reduce((sum, review) => sum + review.rating, 0) /
          user.reviewsReceived.length
        : 0;

    const yearsActive = Math.max(
      0,
      new Date().getFullYear() - new Date(user.createdAt).getFullYear(),
    );

    const verifiedDocs = await this.prisma.document.count({
      where: { userId: user.id, status: "VERIFIED" },
    });

    const userKyc = await this.prisma.userKyc.findFirst({
      where: { userId: user.id },
    });

    const trust = calculateUserTrustScore({
      kycStatus: (userKyc?.status ?? KycStatus.PENDING) as any,
      docVerifiedCount: verifiedDocs,
      docRequiredCount: 2,
      verifiedEmail: Boolean(user.email),
      verifiedPhone: Boolean(user.phone),
      yearsActive,
      verifiedTransactions: 0,
      avgRating: reviewAvg,
      reviewCount: user.reviewsReceived.length,
      complaintResolutionRate: 0.9,
    });

    const affiliation = user.agencyMemberships?.[0]?.agency
      ? {
          agencyId: user.agencyMemberships[0].agency.id,
          name: user.agencyMemberships[0].agency.name,
          logoUrl: user.agencyMemberships[0].agency.logoUrl,
        }
      : null;

    return {
      id: user.id,
      name: user.name ?? "Unnamed User",
      phone: user.phone ?? null,
      profilePhoto: user.profilePhoto,
      role: user.role,
      location: user.location,
      joinedAt: user.createdAt,
      trust: {
        score: trust.score,
        tier: this.mapTrustTier(trust.score),
        breakdown: trust.breakdown,
        explanation: trust.explanation,
      },
      affiliation,
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
      reviews: user.reviewsReceived.map((review) => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        author: review.reviewer?.name ?? "Anonymous",
        createdAt: review.createdAt,
      })),
    };
  }

  async getPublicUserListings(userId: string, query: GetUserListingsDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 12;
    const verifiedOnly = query.verifiedOnly ?? true;

    const baseWhere: any = {
      OR: [{ agentOwnerId: userId }, { assignedAgentId: userId }],
      status: { in: [PropertyStatus.PUBLISHED, PropertyStatus.VERIFIED] },
    };

    if (query.intent) {
      baseWhere.listingIntent = query.intent;
    }

    if (verifiedOnly) {
      baseWhere.OR = [
        {
          ...baseWhere.OR[0],
          verificationLevel: {
            in: [VerificationLevel.VERIFIED, VerificationLevel.TRUSTED],
          },
        },
        {
          ...baseWhere.OR[1],
          verificationLevel: {
            in: [VerificationLevel.VERIFIED, VerificationLevel.TRUSTED],
          },
        },
      ];
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
        where: baseWhere,
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
      this.prisma.property.count({ where: baseWhere }),
      this.prisma.property.findMany({
        where: {
          OR: [{ agentOwnerId: userId }, { assignedAgentId: userId }],
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

  async getAdminKyc(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    const kyc = await this.prisma.userKyc.findFirst({
      where: { userId },
      include: {
        identity: true,
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
        targetType: { in: ["userKyc", "document"] },
        targetId: kyc?.id ?? undefined,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return { user, kyc: kyc ? { ...kyc, documents } : null, auditLogs };
  }

  async applyKycAction(
    userId: string,
    action: "approve" | "reject" | "request_info" | "suspend",
    actor: AuthContext,
    notes?: string,
  ) {
    const kyc = await this.prisma.userKyc.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });

    const statusMap: Record<typeof action, KycStatus> = {
      approve: KycStatus.VERIFIED,
      reject: KycStatus.REJECTED,
      request_info: KycStatus.PENDING,
      suspend: KycStatus.REJECTED,
    };

    const updated = await this.prisma.userKyc.update({
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
      action: "user.kyc.action",
      actorId: actor.userId,
      targetType: "userKyc",
      targetId: updated.id,
      metadata: { action, notes },
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
    if ((sigBytes as any).length !== (expBytes as any).length) {
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
