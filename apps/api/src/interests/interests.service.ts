import { Injectable, Logger, BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { Role } from "@propad/config";
import { PrismaService } from "../prisma/prisma.service";
import { AuthContext } from "../auth/interfaces/auth-context.interface";

@Injectable()
export class InterestsService {
  private readonly logger = new Logger(InterestsService.name);

  constructor(private readonly prisma: PrismaService) { }

  async toggleInterest(userId: string, propertyId: string) {
    // Check if interest exists
    const existing = await this.prisma.interest.findUnique({
      where: {
        propertyId_userId: {
          propertyId,
          userId,
        },
      },
    });

    if (existing) {
      // Remove it
      await this.prisma.interest.delete({
        where: {
          propertyId_userId: {
            propertyId,
            userId,
          },
        },
      });
      return { isSaved: false };
    } else {
      // Create it
      try {
        await this.prisma.interest.create({
          data: {
            propertyId,
            userId,
            status: "PENDING", // Default status
          },
        });
        return { isSaved: true };
      } catch (error) {
        // Handle foreign key constraint if property doesn't exist
        this.logger.error(
          `Failed to save property ${propertyId} for user ${userId}`,
          error,
        );
        throw new BadRequestException("Could not save property");
      }
    }
  }

  async getMyInterests(userId: string) {
    return this.prisma.interest.findMany({
      where: { userId },
      include: {
        property: {
          include: {
            media: { take: 1 },
            city: true,
            suburb: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getLandlordInterests(landlordId: string) {
    return this.prisma.interest.findMany({
      where: {
        property: { landlordId },
      },
      include: {
        property: true,
        user: {
          select: { id: true, name: true, email: true, isVerified: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async updateStatus(interestId: string, status: "ACCEPTED" | "REJECTED", actor: AuthContext) {
    const interest = await this.prisma.interest.findUnique({
      where: { id: interestId },
      include: {
        property: { select: { id: true, landlordId: true, agentOwnerId: true } }
      }
    });

    if (!interest) {
      throw new NotFoundException("Interest not found");
    }

    const isOwner = interest.property.landlordId === actor.userId;
    const isAgentOwner = interest.property.agentOwnerId === actor.userId;
    const isAdmin = actor.role === Role.ADMIN;

    if (!isAdmin && !isOwner && !isAgentOwner) {
      throw new ForbiddenException("You do not have permission to update this interest");
    }

    const updated = await this.prisma.interest.update({
      where: { id: interestId },
      data: { status }
    });

    if (status === "ACCEPTED") {
      await this.prisma.interest.updateMany({
        where: {
          propertyId: interest.propertyId,
          id: { not: interestId },
          status: "PENDING"
        },
        data: { status: "ON_HOLD" }
      });
    }

    return updated;
  }
}
