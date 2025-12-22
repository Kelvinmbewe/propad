import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { compare, hash } from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';

export interface SanitizedUser {
  id: string;
  role: Role;
  name: string | null;
  phone: string | null;
  email: string | null;
  kycStatus: string | null;
  status: string | null;
  createdAt: Date;
  profileId?: string;
  agencyId?: string;
  trustScore: number;
  verificationScore: number;
  isVerified: boolean;
}

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly jwtService: JwtService) { }

  async validateUser(email: string, pass: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        agentProfile: true,
        landlordProfile: true,
        agencyMemberships: {
          where: { isActive: true },
          take: 1
        }
      }
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await compare(pass, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.sanitizeUser(user);
  }

  async login(email: string, password: string) {
    const user = await this.validateUser(email, password);
    return this.issueTokens(user);
  }

  async register(email: string, password: string, name?: string) {
    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new UnauthorizedException('User already exists');
    }

    const passwordHash = await hash(password, 10);
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        role: Role.USER,
        status: 'ACTIVE'
      },
      include: {
        agentProfile: true,
        landlordProfile: true,
        agencyMemberships: true
      }
    });

    return this.issueTokens(this.sanitizeUser(user));
  }

  async refresh(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        agentProfile: true,
        landlordProfile: true,
        agencyMemberships: {
          where: { isActive: true },
          take: 1
        }
      }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.issueTokens(this.sanitizeUser(user));
  }

  async getSession(userId: string): Promise<SanitizedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        agentProfile: true,
        landlordProfile: true,
        agencyMemberships: {
          where: { isActive: true },
          take: 1
        }
      }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.sanitizeUser(user);
  }

  private async issueTokens(user: SanitizedUser) {
    const payload = {
      sub: user.id,
      role: user.role,
      profileId: user.profileId,
      agencyId: user.agencyId
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, { expiresIn: '15m' }),
      this.jwtService.signAsync(payload, { expiresIn: '7d' })
    ]);

    return {
      accessToken,
      refreshToken,
      user
    };
  }

  private sanitizeUser<T extends {
    id: string;
    passwordHash?: string | null;
    agentProfile?: { userId: string } | null;
    landlordProfile?: { userId: string } | null;
    agencyMemberships?: { agencyId: string }[] | null;
  }>(user: T): SanitizedUser {
    const { passwordHash, agentProfile, landlordProfile, agencyMemberships, ...rest } = user;

    // Determine profileId (usually same as userId for these profiles, but could be different if architecture changes)
    let profileId = user.id;
    // For now, these profiles share the PK with User, so it is redundant but explicit.

    // Determine Agency ID
    const agencyId = agencyMemberships?.[0]?.agencyId;

    return {
      ...rest,
      profileId,
      agencyId
    } as unknown as SanitizedUser;
  }
}
