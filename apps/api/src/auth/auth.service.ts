import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { compare } from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';

interface SanitizedUser {
  id: string;
  role: Role;
  name: string | null;
  phone: string | null;
  email: string | null;
  kycStatus: string | null;
  status: string | null;
  createdAt: Date;
}

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly jwtService: JwtService) {}

  async validateUser(email: string, pass: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
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
    return this.issueTokens(user.id, user.role);
  }

  async refresh(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.issueTokens(user.id, user.role);
  }

  async getSession(userId: string): Promise<SanitizedUser> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.sanitizeUser(user);
  }

  private async issueTokens(userId: string, role: Role) {
    const payload = { sub: userId, role };
    const [accessToken, refreshToken, user] = await Promise.all([
      this.jwtService.signAsync(payload, { expiresIn: '15m' }),
      this.jwtService.signAsync(payload, { expiresIn: '7d' }),
      this.prisma.user.findUnique({ where: { id: userId } })
    ]);

    return {
      accessToken,
      refreshToken,
      user: user ? this.sanitizeUser(user) : undefined
    };
  }

  private sanitizeUser<T extends { passwordHash?: string | null }>(user: T): SanitizedUser {
    const { passwordHash, ...rest } = user;
    return rest as unknown as SanitizedUser;
  }
}
