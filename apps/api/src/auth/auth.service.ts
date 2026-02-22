import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { AgencyMemberRole, AgencyStatus, Role } from "@propad/config";
import { compare, hash } from "bcryptjs";
import * as speakeasy from "speakeasy";
import QRCode from "qrcode";
import { nanoid } from "nanoid";
import { createHash, randomBytes } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { RiskService } from "../security/risk.service";
import { ReferralsService } from "../growth/referrals/referrals.service";

export interface SanitizedUser {
  id: string;
  role: Role;
  name: string | null;
  phone: string | null;
  email: string | null;
  kycStatus: string | null;
  status: string | null;
  mfaEnabled: boolean;
  createdAt: Date;
  profileId?: string;
  agencyId?: string;
  trustScore: number;
  verificationScore: number;
  isVerified: boolean;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly riskService: RiskService,
    private readonly referralsService: ReferralsService,
  ) {}

  async validateUser(email: string, pass: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        agentProfile: true,
        landlordProfile: true,
        agencyMemberships: {
          where: { isActive: true },
          take: 1,
        },
      },
    });

    // 1. Check Lock Protocol - temporarily removed as lockedUntil field not in schema
    // if (user && user.lockedUntil && user.lockedUntil > new Date()) {
    //   await this.riskService.logEvent(user.id, 'LOGIN_LOCKED', 'MEDIUM', { email });
    //   throw new UnauthorizedException(`Account locked. Try again after ${user.lockedUntil.toISOString()}`);
    // }

    if (!user || !user.passwordHash) {
      // Don't leak user existence too easily, but log generic fail
      // await this.riskService.logEvent(null, 'LOGIN_FAIL_UNKNOWN', 'LOW', { email });
      throw new UnauthorizedException("Invalid credentials");
    }

    if (user.deletedAt) {
      throw new UnauthorizedException("Account archived");
    }

    const isValid = await compare(pass, user.passwordHash);
    if (!isValid) {
      // 2. Handle Failure logic - temporarily simplified as tracking fields not in schema
      await this.riskService.logEvent(user.id, "LOGIN_FAIL", "LOW", {
        email,
      });

      throw new UnauthorizedException("Invalid credentials");
    }

    return user;
  }

  async login(email: string, password: string, otp?: string) {
    const rawUser = await this.validateUser(email, password);
    const user = await this.ensureRoleFromListings(
      rawUser.id,
      rawUser.role as Role,
    );
    const mfaUser = user as typeof user & {
      mfaEnabled?: boolean;
      mfaSecret?: string | null;
      mfaRecoveryCodes?: string[] | null;
    };

    const isDevMode =
      process.env.NODE_ENV === "development" || process.env.DEV_MODE === "true";

    if (mfaUser.mfaEnabled && !isDevMode) {
      if (!otp) {
        throw new UnauthorizedException({
          message: "MFA_REQUIRED",
          mfaRequired: true,
        });
      }

      const isValid = speakeasy.totp.verify({
        secret: mfaUser.mfaSecret ?? "",
        encoding: "base32",
        token: otp,
      });

      if (!isValid) {
        const recoveryValid = await this.consumeRecoveryCode(user.id, otp);
        if (!recoveryValid) {
          throw new UnauthorizedException("Invalid MFA code");
        }
      }
    }

    return this.issueTokens(this.sanitizeUser(user));
  }

  async register(
    email: string,
    password: string,
    name?: string,
    phone?: string,
    _role?: Role,
    _companyName?: string,
    referralCode?: string,
    meta?: { ip?: string; deviceId?: string },
  ) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new UnauthorizedException("User already exists");
    }

    const passwordHash = await hash(password, 10);
    const userRole = Role.USER;
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        phone: phone ?? null,
        role: userRole as any,
        status: "ACTIVE",
      },
      include: {
        agentProfile: true,
        landlordProfile: true,
        agencyMemberships: true,
      },
    });

    // Growth: Track Referral if code provided
    if (referralCode) {
      await this.referralsService.trackSignup({
        userId: user.id,
        referralCode,
        ipAddress: meta?.ip,
        deviceId: meta?.deviceId,
      });
    }

    return this.issueTokens(this.sanitizeUser(user));
  }

  async refresh(userId: string) {
    const user = await this.ensureRoleFromListings(userId);

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return this.issueTokens(this.sanitizeUser(user));
  }

  async getSession(userId: string): Promise<SanitizedUser> {
    const user = await this.ensureRoleFromListings(userId);

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return this.sanitizeUser(user);
  }

  async createRoleUpgradeToken(
    actorId: string,
    targetRole: Role,
    options?: { ttlHours?: number; campaign?: string; note?: string },
  ) {
    const ttlHours = options?.ttlHours ?? 72;
    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");

    await this.prisma.roleUpgradeToken.create({
      data: {
        tokenHash,
        targetRole: targetRole as any,
        expiresAt: new Date(Date.now() + ttlHours * 60 * 60 * 1000),
        issuedById: actorId,
        campaign: options?.campaign,
        note: options?.note,
      },
    });

    return { token: rawToken, targetRole };
  }

  async redeemRoleUpgradeToken(userId: string, token: string) {
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const record = await this.prisma.roleUpgradeToken.findUnique({
      where: { tokenHash },
    });

    if (!record || record.usedAt || record.expiresAt <= new Date()) {
      throw new BadRequestException("Upgrade link is invalid or expired");
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { role: record.targetRole as any },
      }),
      this.prisma.roleUpgradeToken.update({
        where: { id: record.id },
        data: { usedAt: new Date(), usedByUserId: userId },
      }),
    ]);

    if (record.targetRole === Role.COMPANY_ADMIN) {
      const existingOwnerAgency = await this.prisma.agencyMember.findFirst({
        where: {
          userId,
          role: AgencyMemberRole.OWNER,
          isActive: true,
        },
      });

      if (!existingOwnerAgency) {
        await this.prisma.agency.create({
          data: {
            name: "My Agency",
            status: AgencyStatus.PENDING,
            members: {
              create: {
                userId,
                role: AgencyMemberRole.OWNER,
              },
            },
          },
        });
      }
    }

    const user = await this.ensureRoleFromListings(userId);
    return this.issueTokens(this.sanitizeUser(user));
  }

  async selfServeUpgrade(userId: string, targetRole: Role) {
    const allowedTargets = [Role.AGENT, Role.COMPANY_ADMIN, Role.ADVERTISER];
    if (!allowedTargets.includes(targetRole)) {
      throw new BadRequestException("Unsupported upgrade target");
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { role: targetRole as any },
    });

    if (targetRole === Role.COMPANY_ADMIN) {
      const existingOwnerAgency = await this.prisma.agencyMember.findFirst({
        where: {
          userId,
          role: AgencyMemberRole.OWNER,
          isActive: true,
        },
      });
      if (!existingOwnerAgency) {
        await this.prisma.agency.create({
          data: {
            name: "My Agency",
            status: AgencyStatus.PENDING,
            members: {
              create: {
                userId,
                role: AgencyMemberRole.OWNER,
              },
            },
          },
        });
      }
    }

    const user = await this.ensureRoleFromListings(userId);
    return this.issueTokens(this.sanitizeUser(user));
  }

  private async ensureRoleFromListings(userId: string, roleHint?: Role) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        agentProfile: true,
        landlordProfile: true,
        agencyMemberships: {
          where: { isActive: true },
          take: 1,
        },
      },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const effectiveRole = (roleHint ?? (user.role as Role)) as Role;
    if (effectiveRole !== Role.USER) {
      return user;
    }

    const ownedListingsCount = await this.prisma.property.count({
      where: {
        OR: [
          { ownerId: userId },
          { landlordId: userId },
          { agentOwnerId: userId },
        ],
      },
    });

    if (!ownedListingsCount) {
      return user;
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { role: Role.LANDLORD as any },
      include: {
        agentProfile: true,
        landlordProfile: true,
        agencyMemberships: {
          where: { isActive: true },
          take: 1,
        },
      },
    });
  }

  private async issueTokens(user: SanitizedUser) {
    const payload = {
      sub: user.id,
      role: user.role,
      profileId: user.profileId,
      agencyId: user.agencyId,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, { expiresIn: "15m" }),
      this.jwtService.signAsync(payload, { expiresIn: "7d" }),
    ]);

    return {
      accessToken,
      refreshToken,
      user,
    };
  }

  async setupMfa(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    const mfaUser = user as typeof user & {
      mfaTempSecret?: string | null;
    };

    const secret = speakeasy.generateSecret({
      name: `PropAd (${user.email ?? user.id})`,
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaTempSecret: secret.base32 } as any,
    });

    const qrCode = secret.otpauth_url
      ? await QRCode.toDataURL(secret.otpauth_url)
      : null;

    return {
      secret: secret.base32,
      otpauthUrl: secret.otpauth_url,
      qrCode,
    };
  }

  async generateRecoveryCodes(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !(user as any).mfaEnabled) {
      throw new BadRequestException(
        "Enable MFA before generating recovery codes",
      );
    }

    const codes = Array.from({ length: 8 }).map(() => nanoid(10).toUpperCase());
    const hashedCodes = await Promise.all(codes.map((code) => hash(code, 10)));

    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaRecoveryCodes: hashedCodes } as any,
    });

    return { codes };
  }

  async verifyMfa(userId: string, token: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const mfaUser = user as typeof user & {
      mfaTempSecret?: string | null;
    };

    if (!user || !mfaUser.mfaTempSecret) {
      throw new BadRequestException("No MFA setup in progress");
    }

    const isValid = speakeasy.totp.verify({
      secret: mfaUser.mfaTempSecret,
      encoding: "base32",
      token,
    });

    if (!isValid) {
      throw new UnauthorizedException("Invalid MFA code");
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: true,
        mfaSecret: mfaUser.mfaTempSecret,
        mfaTempSecret: null,
      } as any,
    });

    return { enabled: true };
  }

  async disableMfa(userId: string, token: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const mfaUser = user as typeof user & {
      mfaEnabled?: boolean;
      mfaSecret?: string | null;
      mfaRecoveryCodes?: string[] | null;
    };

    if (!user || !mfaUser.mfaSecret || !mfaUser.mfaEnabled) {
      throw new BadRequestException("MFA is not enabled");
    }

    const totpValid = speakeasy.totp.verify({
      secret: mfaUser.mfaSecret,
      encoding: "base32",
      token,
    });
    const recoveryValid = totpValid
      ? true
      : await this.consumeRecoveryCode(userId, token);

    if (!recoveryValid) {
      throw new UnauthorizedException("Invalid MFA code");
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: false,
        mfaSecret: null,
        mfaTempSecret: null,
        mfaRecoveryCodes: [],
      } as any,
    });

    return { enabled: false };
  }

  private sanitizeUser<
    T extends {
      id: string;
      passwordHash?: string | null;
      agentProfile?: { userId: string } | null;
      landlordProfile?: { userId: string } | null;
      agencyMemberships?: { agencyId: string }[] | null;
      mfaSecret?: string | null;
      mfaTempSecret?: string | null;
      mfaRecoveryCodes?: string[] | null;
    },
  >(user: T): SanitizedUser {
    const {
      passwordHash,
      agentProfile,
      landlordProfile,
      agencyMemberships,
      mfaSecret,
      mfaTempSecret,
      mfaRecoveryCodes,
      ...rest
    } = user;

    // Determine profileId (usually same as userId for these profiles, but could be different if architecture changes)
    let profileId = user.id;
    // For now, these profiles share the PK with User, so it is redundant but explicit.

    // Determine Agency ID
    const agencyId = agencyMemberships?.[0]?.agencyId;

    return {
      ...rest,
      profileId,
      agencyId,
      mfaEnabled: (user as any).mfaEnabled ?? false,
    } as unknown as SanitizedUser;
  }

  private async consumeRecoveryCode(userId: string, code: string) {
    if (!code) return false;
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return false;

    const codes = ((user as any).mfaRecoveryCodes ?? []) as string[];
    if (codes.length === 0) return false;

    for (const hashed of codes) {
      const matches = await compare(code, hashed);
      if (matches) {
        const nextCodes = codes.filter((value) => value !== hashed);
        await this.prisma.user.update({
          where: { id: userId },
          data: { mfaRecoveryCodes: nextCodes } as any,
        });
        return true;
      }
    }

    return false;
  }
}
