import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { calculateTrustScore } from "./trust-score";
import { KycStatus } from "@prisma/client";
import { createHmac, timingSafeEqual } from "crypto";
import { existsSync } from "fs";
import { join, resolve } from "path";

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

  private async ensureCompanyForAgency(id: string) {
    let company = await this.prisma.company.findUnique({
      where: { id },
    });
    const agencyId = company?.agencyId ?? id;

    const agency = await this.prisma.agency.findUnique({
      where: { id: agencyId },
    });
    if (!agency) {
      throw new NotFoundException("Company not found");
    }

    if (!company) {
      company = await this.prisma.company.findFirst({
        where: { agencyId },
      });
    }

    if (!company) {
      company = await this.prisma.company.create({
        data: {
          agencyId,
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

    return {
      id: company.id,
      agencyId: agency.id,
      name: company.name ?? agency.name,
      logoUrl: company.logoUrl ?? agency.logoUrl,
      coverUrl: company.coverUrl,
      shortDescription: company.shortDescription ?? agency.shortDescription,
      description: company.description ?? agency.description ?? agency.bio,
      services: company.servicesJson ?? agency.servicesOffered,
      areasServed: company.areasServedJson,
      hours: company.hoursJson,
      languages: company.languagesJson,
      socialLinks: company.socialLinksJson,
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
