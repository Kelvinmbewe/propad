import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Role } from "@propad/config";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import {
  CreateSavedSearchDto,
  createSavedSearchSchema,
} from "./dto/create-saved-search.dto";
import { SavedSearchesService } from "./saved-searches.service";
import { AuthenticatedRequest } from "../auth/interfaces/authenticated-request.interface";

@Controller("saved-searches")
@UseGuards(JwtAuthGuard, RolesGuard)
export class SavedSearchesController {
  constructor(private readonly savedSearchesService: SavedSearchesService) {}

  @Post()
  @Roles(Role.USER, Role.AGENT, Role.LANDLORD, Role.ADMIN)
  async create(
    @Request() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(createSavedSearchSchema))
    dto: CreateSavedSearchDto,
  ) {
    return this.savedSearchesService.create(req.user.userId, dto);
  }

  @Get("my")
  @Roles(Role.USER, Role.AGENT, Role.LANDLORD, Role.ADMIN)
  async list(
    @Request() req: AuthenticatedRequest,
    @Query("limit") limit?: string,
  ) {
    const parsedLimit = limit ? Number(limit) : undefined;
    return this.savedSearchesService.list(
      req.user.userId,
      parsedLimit && Number.isFinite(parsedLimit) ? parsedLimit : 20,
    );
  }

  @Delete(":id")
  @Roles(Role.USER, Role.AGENT, Role.LANDLORD, Role.ADMIN)
  async remove(@Request() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.savedSearchesService.remove(req.user.userId, id);
  }
}
