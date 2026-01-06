import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Role } from '@propad/config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET
    });
  }

  async validate(payload: { sub: string; role: Role; profileId?: string; agencyId?: string; email?: string; name?: string }) {
    const userId = payload.sub;
    const role = payload.role;

    // Ensure req.user.id is the DATABASE User.id, not email, username, or provider id
    if (!userId || typeof userId !== 'string') {
      this.logger.warn('Invalid user ID in JWT payload');
      return null;
    }

    // Safe auto-sync mechanism: When req.user is present, if no User record exists with req.user.id, create it
    // This sync must: Run once, Never overwrite existing users, Be transaction-safe
    try {
      // Check if user exists
      const existingUser = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true }
      });

      // If no User record exists with req.user.id, create the user in the database
      if (!existingUser) {
        // Determine role: ADMIN or VERIFIER (based on auth claims), or use payload role
        const userRole = role === Role.ADMIN || role === Role.VERIFIER ? role : Role.USER;

        try {
          // Create user with:
          // id = req.user.id (payload.sub) - ensures req.user.id is the DATABASE User.id
          // email = req.user.email (from payload if available, otherwise null)
          // name = req.user.name (from payload if available, otherwise null)
          // role = ADMIN or VERIFIER (based on auth claims)
          await this.prisma.user.create({
            data: {
              id: userId,
              email: payload.email || null,
              name: payload.name || null,
              role: userRole,
              status: 'ACTIVE'
            }
          });

          this.logger.log(`Auto-created user ${userId} with role ${userRole}`);
        } catch (createError: any) {
          // Handle race condition: if another request created the user between our check and create
          // Check if it's a unique constraint violation (user was created by another request)
          if (createError?.code === 'P2002' || createError?.message?.includes('Unique constraint')) {
            // User was created by another concurrent request - this is fine, fetch it
            const raceConditionUser = await this.prisma.user.findUnique({
              where: { id: userId },
              select: { id: true }
            });
            if (raceConditionUser) {
              this.logger.debug(`User ${userId} was created by concurrent request`);
            } else {
              this.logger.warn(`Failed to create user ${userId} and user still does not exist:`, createError);
            }
          } else {
            // Some other error occurred
            this.logger.error(`Failed to create user ${userId}:`, createError);
            // Don't throw - let the request proceed, but log the error
            // The downstream code will handle missing users appropriately
          }
        }
      }
    } catch (error) {
      // If any error occurs during user sync, log it but don't block the request
      // The downstream code (verification service) will validate the user exists
      this.logger.error(`Error during user sync for ${userId}:`, error);
    }

    return {
      userId: payload.sub,
      role: payload.role,
      profileId: payload.profileId,
      agencyId: payload.agencyId
    };
  }
}
