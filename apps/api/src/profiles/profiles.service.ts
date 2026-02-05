import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { BadgesHelper, TrustBadge } from "../trust/badges.helper";
import { AuditService } from "../audit/audit.service";
import { KycStatus, OwnerType } from "@prisma/client";
import { existsSync } from "fs";
import { mkdir, writeFile } from "fs/promises";
import { join, resolve } from "path";

@Injectable()
export class ProfilesService {
  constructor(
    private prisma: PrismaService,
    private badgesHelper: BadgesHelper,
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

  async getPublicUserProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        agentProfile: true,
        landlordProfile: true,
        siteVisitsAssigned: { where: { status: "COMPLETED" } }, // For badge calc
        reviewsReceived: {
          take: 5,
          orderBy: { createdAt: "desc" },
          include: {
            reviewer: { select: { id: true, name: true, profilePhoto: true } },
          },
        },
      },
    });

    if (!user) throw new NotFoundException("User not found");

    // Safe DTO transformation
    const badges = this.badgesHelper.getUserBadges(user);

    // Hide sensitive risk data
    const safeReviewCount = user.reviewsReceived.length; // Approximate, or fetch count

    return {
      id: user.id,
      name: user.name ?? "Unnamed User",
      profilePhoto: user.profilePhoto,
      bio: user.bio,
      location: user.location,
      roles: [user.role], // Simplify to array
      stats: {
        joinedAt: user.createdAt,
        trustTier: this.mapTrustTierToPublic(user.trustScore),
        verificationLevel: user.isVerified ? "VERIFIED" : "UNVERIFIED",
        reviewCount: safeReviewCount, // Real app would use _count
      },
      badges,
      recentReviews: user.reviewsReceived.map((r: any) => ({
        id: r.id,
        author: r.reviewer?.name ?? "Anonymous",
        rating: r.rating,
        comment: r.comment,
        date: r.createdAt,
      })),
    };
  }

  async getUserProfileForAdmin(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        dateOfBirth: true,
        idNumber: true,
        addressLine1: true,
        addressCity: true,
        addressProvince: true,
        addressCountry: true,
        location: true,
        kycStatus: true,
        isVerified: true,
        createdAt: true,
      },
    });

    if (!user) throw new NotFoundException("User not found");

    return user;
  }

  async getPublicAgencyProfile(agencyId: string) {
    const agency = await this.prisma.agency.findUnique({
      where: { id: agencyId },
      include: {
        reviews: {
          take: 5,
          orderBy: { createdAt: "desc" },
          include: { reviewer: { select: { name: true } } },
        },
        members: {
          include: {
            user: { select: { id: true, name: true, profilePhoto: true } },
          },
        },
      },
    });

    if (!agency) throw new NotFoundException("Agency not found");

    const badges = this.badgesHelper.getAgencyBadges(agency);

    return {
      id: agency.id,
      name: agency.name,
      logo: agency.logoUrl,
      bio: agency.bio,
      shortDescription: (agency as any).shortDescription ?? null,
      description: (agency as any).description ?? null,
      servicesOffered: (agency as any).servicesOffered ?? null,
      stats: {
        agentCount: agency.members.length,
        trustTier: this.mapTrustTierToPublic(agency.trustScore),
        verified: agency.verificationScore > 0,
      },
      badges,
      agents: agency.members
        .filter((member: any) => member.user)
        .map((m: any) => ({
          id: m.userId,
          name: m.user?.name ?? "Unnamed Agent",
          photo: m.user?.profilePhoto ?? null,
        })),
      recentReviews: agency.reviews.map((r: any) => ({
        rating: r.rating,
        comment: r.comment,
        author: r.reviewer.name,
        date: r.createdAt,
      })),
    };
  }

  async getMyProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        trustScore: true,
        verificationScore: true,
        kycStatus: true,
        isVerified: true,
        profilePhoto: true,
        dateOfBirth: true,
        idNumber: true,
        addressLine1: true,
        addressCity: true,
        addressProvince: true,
        addressCountry: true,
        location: true,
        createdAt: true,
      },
    });
    if (!user) throw new NotFoundException("User not found");
    return user;
  }

  async updateUserProfile(
    userId: string,
    data: {
      name?: string;
      phone?: string;
      dateOfBirth?: string;
      idNumber?: string;
      addressLine1?: string;
      addressCity?: string;
      addressProvince?: string;
      addressCountry?: string;
      location?: string;
    },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("User not found");

    const docTypesToUpdate = new Set<string>();
    const identityFieldsChanged =
      (data.name !== undefined && data.name.trim() !== (user.name ?? "")) ||
      (data.dateOfBirth !== undefined &&
        new Date(data.dateOfBirth).toISOString() !==
          (user.dateOfBirth ? user.dateOfBirth.toISOString() : "")) ||
      (data.idNumber !== undefined &&
        data.idNumber.trim() !== (user.idNumber ?? ""));
    const addressFieldsChanged =
      (data.addressLine1 !== undefined &&
        data.addressLine1.trim() !== (user.addressLine1 ?? "")) ||
      (data.addressCity !== undefined &&
        data.addressCity.trim() !== (user.addressCity ?? "")) ||
      (data.addressProvince !== undefined &&
        data.addressProvince.trim() !== (user.addressProvince ?? "")) ||
      (data.addressCountry !== undefined &&
        data.addressCountry.trim() !== (user.addressCountry ?? "")) ||
      (data.location !== undefined &&
        data.location.trim() !== (user.location ?? ""));
    if (identityFieldsChanged) docTypesToUpdate.add("IDENTITY");
    if (addressFieldsChanged) docTypesToUpdate.add("PROOF_ADDRESS");

    const cleaned = {
      name: data.name?.trim() || undefined,
      phone: data.phone?.trim() || undefined,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
      idNumber: data.idNumber?.trim() || undefined,
      addressLine1: data.addressLine1?.trim() || undefined,
      addressCity: data.addressCity?.trim() || undefined,
      addressProvince: data.addressProvince?.trim() || undefined,
      addressCountry: data.addressCountry?.trim() || undefined,
      location: data.location?.trim() || undefined,
    };

    const updated = await this.prisma.$transaction(async (tx) => {
      const userUpdate = await tx.user.update({
        where: { id: userId },
        data: cleaned as any,
      });
      if (docTypesToUpdate.size > 0) {
        await tx.kycRecord.create({
          data: {
            ownerType: OwnerType.USER,
            ownerId: userId,
            idType: "NATIONAL_ID",
            idNumber: "PROFILE_UPDATE",
            docUrls: [],
            docTypes: Array.from(docTypesToUpdate),
            notes: "PROFILE_UPDATE",
            status: KycStatus.PENDING,
          } as any,
        });
      }
      return userUpdate;
    });

    await this.audit.logAction({
      action: "profile.update",
      actorId: userId,
      targetType: "user",
      targetId: userId,
      metadata: { fields: Object.keys(data) },
    });

    return updated;
  }

  async updateUserPhoto(
    userId: string,
    file: { filename: string; mimetype: string; buffer: Buffer },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("User not found");

    const uploadsRoot = this.resolveUploadsRoot();
    await mkdir(uploadsRoot, { recursive: true });
    const uploadsDir = join(uploadsRoot, "profiles", "users", userId);
    await mkdir(uploadsDir, { recursive: true });

    const safeName = file.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const uniqueName = `${Date.now()}-${safeName}`;
    const filePath = join(uploadsDir, uniqueName);
    await writeFile(filePath, file.buffer as Uint8Array);

    const profilePhoto = `/uploads/profiles/users/${userId}/${uniqueName}`;
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { profilePhoto },
    });

    await this.audit.logAction({
      action: "profile.photo.update",
      actorId: userId,
      targetType: "user",
      targetId: userId,
      metadata: { previous: user.profilePhoto, profilePhoto },
    });

    return { url: profilePhoto, user: updated };
  }

  private mapTrustTierToPublic(score: number): string {
    if (score >= 90) return "Elite";
    if (score >= 70) return "Trusted";
    if (score >= 40) return "Verified";
    return "Standard";
  }
}
