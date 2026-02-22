import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { CreateSavedSearchDto } from "./dto/create-saved-search.dto";

@Injectable()
export class SavedSearchesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateSavedSearchDto) {
    return this.prisma.savedSearch.create({
      data: {
        userId,
        name: dto.name ?? null,
        intent: dto.intent ?? null,
        locationLabel: dto.locationLabel ?? null,
        locationId: dto.locationId ?? null,
        locationLevel: dto.locationLevel ?? null,
        propertyType: dto.propertyType ?? null,
        priceRange: dto.priceRange ?? null,
        verifiedOnly: dto.verifiedOnly ?? true,
        minTrust: dto.minTrust ?? 0,
        queryJson: dto.queryJson,
      },
    });
  }

  async list(userId: string, limit = 20) {
    return this.prisma.savedSearch.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: Math.min(Math.max(limit, 1), 50),
    });
  }

  async remove(userId: string, id: string) {
    const result = await this.prisma.savedSearch.deleteMany({
      where: { id, userId },
    });
    return { deleted: result.count > 0 };
  }
}
