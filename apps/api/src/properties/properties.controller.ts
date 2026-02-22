import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Role } from "@propad/config";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { OptionalJwtAuthGuard } from "../auth/guards/optional-jwt-auth.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { PropertiesService } from "./properties.service";
import { SearchPropertiesDto } from "./dto/search-properties.dto";
import {
  CreatePropertyDto,
  createPropertySchema,
} from "./dto/create-property.dto";
import {
  UpdatePropertyDto,
  updatePropertySchema,
} from "./dto/update-property.dto";
import {
  SubmitForVerificationDto,
  submitForVerificationSchema,
} from "./dto/submit-verification.dto";
import { MapBoundsDto, mapBoundsSchema } from "./dto/map-bounds.dto";
import {
  HomeListingsQueryDto,
  homeListingsQuerySchema,
} from "./dto/home-listings-query.dto";
import {
  HomeCountsQueryDto,
  homeCountsQuerySchema,
} from "./dto/home-counts-query.dto";
import {
  HomeAreasQueryDto,
  homeAreasQuerySchema,
} from "./dto/home-areas-query.dto";
import {
  HomeLocationEventDto,
  homeLocationEventSchema,
} from "./dto/home-location-event.dto";
import {
  CreateSignedUploadDto,
  createSignedUploadSchema,
} from "./dto/signed-upload.dto";
import { LinkMediaDto, linkMediaSchema } from "./dto/link-media.dto";
import {
  UpdatePropertyStatusDto,
  updatePropertyStatusSchema,
} from "./dto/update-property-status.dto";
import { AssignAgentDto, assignAgentSchema } from "./dto/assign-agent.dto";
import {
  UpdateDealConfirmationDto,
  updateDealConfirmationSchema,
} from "./dto/update-deal-confirmation.dto";
import {
  CreateMessageDto,
  createMessageSchema,
} from "./dto/create-message.dto";
import {
  UpdateServiceFeeDto,
  updateServiceFeeSchema,
} from "./dto/update-service-fee.dto";
import {
  CreateManagementAssignmentDto,
  createManagementAssignmentSchema,
} from "./dto/create-management-assignment.dto";
import {
  SetOperatingAgentDto,
  setOperatingAgentSchema,
} from "./dto/set-operating-agent.dto";
import {
  CreateOfflineListingPaymentDto,
  createOfflineListingPaymentSchema,
} from "./dto/create-offline-listing-payment.dto";
import {
  CreateListingInvoiceDto,
  createListingInvoiceSchema,
} from "./dto/create-listing-invoice.dto";

import {
  ScheduleViewingDto,
  scheduleViewingSchema,
} from "./dto/schedule-viewing.dto";
import {
  CreateViewingSlotsDto,
  createViewingSlotsSchema,
} from "./dto/create-viewing-slots.dto";
import {
  UpdateViewingSlotDto,
  updateViewingSlotSchema,
} from "./dto/update-viewing-slot.dto";
import {
  RespondViewingDto,
  respondViewingSchema,
} from "./dto/respond-viewing.dto";
import {
  UpdateVerificationItemDto,
  updateVerificationItemSchema,
} from "./dto/update-verification-item.dto";
import {
  ReviewVerificationItemDto,
  reviewVerificationItemSchema,
} from "./dto/review-verification-item.dto";
import {
  SubmitPropertyRatingDto,
  submitPropertyRatingSchema,
} from "./dto/submit-property-rating.dto";
import {
  CreateRentPaymentDto,
  createRentPaymentSchema,
} from "./dto/create-rent-payment.dto";
import { PaymentRequired } from "../payments/decorators/payment-required.decorator";
import { PaymentRequiredGuard } from "../payments/guards/payment-required.guard";

interface AuthenticatedRequest {
  user: {
    userId: string;
    role: Role;
  };
}

@Controller("properties")
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async listOwned(@Req() req: AuthenticatedRequest) {
    try {
      const result = await this.propertiesService.listOwned(req.user);
      // Test serialization
      try {
        JSON.stringify(result);
      } catch (serialError) {
        const serialErrorMessage =
          serialError instanceof Error
            ? serialError.message
            : String(serialError);
        console.error(
          "[PropertiesController] listOwned serialization error:",
          serialErrorMessage,
        );
        // Return empty array instead of throwing to prevent 500
        return [];
      }
      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(
        "[PropertiesController] listOwned error:",
        errorMessage,
        error instanceof Error ? error.stack : "",
      );
      // Return empty array instead of throwing to prevent 500
      return [];
    }
  }

  @Get("agents/verified")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.LANDLORD, Role.ADMIN)
  listVerifiedAgents() {
    return this.propertiesService.listVerifiedAgents();
  }

  @Get("agents/search")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.LANDLORD, Role.ADMIN)
  searchAgents(@Query("q") query: string) {
    return this.propertiesService.searchAgents(query || "");
  }

  @Get("agents/search/agency")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.COMPANY_ADMIN, Role.ADMIN)
  searchAgencyAgents(
    @Query("q") query: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.propertiesService.searchAgencyAgents(query || "", req.user);
  }

  @Get("search")
  search(@Query() dto: SearchPropertiesDto) {
    return this.propertiesService.search(dto);
  }

  @Get("featured")
  listFeatured(
    @Query(new ZodValidationPipe(homeListingsQuerySchema))
    query: HomeListingsQueryDto,
  ) {
    return this.propertiesService.listFeatured(query);
  }

  @Get("home/top-agents")
  topAgentsNear(
    @Query(new ZodValidationPipe(homeListingsQuerySchema))
    query: HomeListingsQueryDto,
  ) {
    return this.propertiesService.getTopAgentsNear(query);
  }

  @Get("home/top-agencies")
  topAgenciesNear(
    @Query(new ZodValidationPipe(homeListingsQuerySchema))
    query: HomeListingsQueryDto,
  ) {
    return this.propertiesService.getTopAgenciesNear(query);
  }

  @Get("home/counts")
  homeCounts(
    @Query(new ZodValidationPipe(homeCountsQuerySchema))
    query: HomeCountsQueryDto,
  ) {
    return this.propertiesService.getHomeCounts(query);
  }

  @Get("home/areas")
  homeAreas(
    @Query(new ZodValidationPipe(homeAreasQuerySchema))
    query: HomeAreasQueryDto,
  ) {
    return this.propertiesService.getHomeAreas(query);
  }

  @Post("home/location-events")
  @UseGuards(OptionalJwtAuthGuard)
  recordHomeLocationEvent(
    @Body(new ZodValidationPipe(homeLocationEventSchema))
    dto: HomeLocationEventDto,
    @Req() req: any,
  ) {
    return this.propertiesService.recordHomeLocationEvent(
      dto,
      req?.user?.userId,
    );
  }

  @Get("map/bounds")
  mapBounds(@Query(new ZodValidationPipe(mapBoundsSchema)) dto: MapBoundsDto) {
    return this.propertiesService.mapBounds(dto);
  }

  @Get(":id")
  @UseGuards(OptionalJwtAuthGuard)
  async findOne(@Param("id") id: string, @Req() req: any) {
    // req.user might be present if guarded or if OptionalAuth applied.
    // Here we'll treat it as permissive, but typed as any for now given AuthenticatedRequest expects user.
    // Ideally we use a decorator @OptionalAuth or just check req.user manually if middleware attaches it.
    // For D3, let's assume public access doesn't have req.user property or it is undefined.
    // Actually, NestJS guards determine strictness.
    // The previous implementation was unguarded public. We want to PASS user if exists.
    // But @Req() without Guard might not have user populated depending on Middleware setup.
    // Let's assume user is not strictly required.

    // Hack: We can't easily inject user without Guard if using standard JwtStrategy globally/locally.
    // If route is PUBLIC, no user.
    // If we want Optional Auth, we need a custom guard or separate endpoints.
    // For SIMPLICITY: Public searches are anonymous.
    // Owners viewing their own DRAFTs should use `listOwned` or we need `GET /properties/my/:id`.
    // OR we just use a separate endpoint for management details?
    // OR we change this to be optional auth.
    // Let's keep it simple: Public Only gets Verified. Owners verify via Dashboard which uses `listOwned` usually?
    // Dashboard usually needs specific details.
    // Let's try to extract user if possible, else undefined.
    const user = req.user;
    return this.propertiesService.findById(id, user);
  }

  @Post(":id/interest")
  @UseGuards(JwtAuthGuard)
  async addInterest(@Param("id") id: string, @Req() req: AuthenticatedRequest) {
    return this.propertiesService.addInterest(id, req.user);
  }

  @Post(":id/view")
  async recordView(@Param("id") id: string) {
    return this.propertiesService.incrementView(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(createPropertySchema)) dto: CreatePropertyDto,
  ) {
    try {
      console.log(
        "[PropertiesController] Creating property with DTO:",
        JSON.stringify(dto, null, 2),
      );
      const result = await this.propertiesService.create(dto, req.user);
      // Test serialization
      try {
        JSON.stringify(result);
      } catch (serialError) {
        const serialErrorMessage =
          serialError instanceof Error
            ? serialError.message
            : String(serialError);
        console.error(
          "[PropertiesController] create serialization error:",
          serialErrorMessage,
        );
        // Return the result anyway - serialization test is just for debugging
      }
      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : "";
      console.error("[PropertiesController] create error:", errorMessage);
      console.error("[PropertiesController] create error stack:", errorStack);

      // DIAGNOSTIC: Re-throw BadRequestException with full details
      // This preserves validation error details from ZodValidationPipe
      if (error instanceof BadRequestException) {
        // Log the full error response for debugging
        const errorResponse = error.getResponse();
        console.error(
          "[PropertiesController] Full validation error response:",
          JSON.stringify(errorResponse, null, 2),
        );
        // Ensure the error response is returned as-is with all diagnostic details
        throw error;
      }
      // For other errors, wrap in BadRequestException with diagnostic details
      const diagnosticError = {
        message: "Failed to create property",
        error: errorMessage,
        stack: errorStack,
        type: error?.constructor?.name || "UnknownError",
      };
      throw new BadRequestException(diagnosticError);
    }
  }

  @Patch(":id/publish")
  @UseGuards(JwtAuthGuard)
  publish(@Param("id") id: string, @Req() req: AuthenticatedRequest) {
    return this.propertiesService.publish(id, req.user);
  }

  @Patch(":id/status")
  @UseGuards(JwtAuthGuard)
  updateStatus(
    @Param("id") id: string,
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(updatePropertyStatusSchema))
    dto: UpdatePropertyStatusDto,
  ) {
    // dto.status is already typed as PropertyStatus from the DTO
    return this.propertiesService.updateStatus(id, dto.status as any, req.user);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard)
  update(
    @Param("id") id: string,
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(updatePropertySchema)) dto: UpdatePropertyDto,
  ) {
    return this.propertiesService.update(id, dto, req.user);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  remove(@Param("id") id: string, @Req() req: AuthenticatedRequest) {
    return this.propertiesService.remove(id, req.user);
  }

  @Post(":id/assign-agent")
  @UseGuards(JwtAuthGuard, RolesGuard, PaymentRequiredGuard)
  @Roles(Role.LANDLORD, Role.ADMIN)
  @PaymentRequired("AGENT_ASSIGNMENT", "id")
  assignVerifiedAgent(
    @Param("id") id: string,
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(assignAgentSchema)) dto: AssignAgentDto,
  ) {
    return this.propertiesService.assignVerifiedAgent(id, dto, req.user);
  }

  @Patch(":id/service-fee")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.LANDLORD, Role.ADMIN)
  updateServiceFee(
    @Param("id") id: string,
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(updateServiceFeeSchema))
    dto: UpdateServiceFeeDto,
  ) {
    return this.propertiesService.updateServiceFee(id, dto, req.user);
  }

  @Delete(":id/agent")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.LANDLORD, Role.ADMIN)
  resignAgent(@Param("id") id: string, @Req() req: AuthenticatedRequest) {
    return this.propertiesService.resignAgent(id, req.user);
  }

  @Post("assignments/:assignmentId/accept")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AGENT, Role.ADMIN)
  acceptAssignment(
    @Param("assignmentId") assignmentId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.propertiesService.acceptAssignment(assignmentId, req.user);
  }

  @Post(":id/management")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.LANDLORD, Role.ADMIN)
  createManagementAssignment(
    @Param("id") id: string,
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(createManagementAssignmentSchema))
    dto: CreateManagementAssignmentDto,
  ) {
    return this.propertiesService.createManagementAssignment(id, dto, req.user);
  }

  @Post("management/:assignmentId/accept")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.AGENT, Role.COMPANY_ADMIN)
  acceptManagementAssignment(
    @Param("assignmentId") assignmentId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.propertiesService.acceptManagementAssignment(
      assignmentId,
      req.user,
    );
  }

  @Post("management/:assignmentId/decline")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.AGENT, Role.COMPANY_ADMIN)
  declineManagementAssignment(
    @Param("assignmentId") assignmentId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.propertiesService.declineManagementAssignment(
      assignmentId,
      req.user,
    );
  }

  @Post("management/:assignmentId/end")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.LANDLORD, Role.COMPANY_ADMIN, Role.AGENT)
  endManagementAssignment(
    @Param("assignmentId") assignmentId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.propertiesService.endManagementAssignment(
      assignmentId,
      req.user,
    );
  }

  @Patch(":id/management/agent")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.LANDLORD, Role.COMPANY_ADMIN)
  setOperatingAgent(
    @Param("id") id: string,
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(setOperatingAgentSchema))
    dto: SetOperatingAgentDto,
  ) {
    return this.propertiesService.setOperatingAgent(id, dto, req.user);
  }

  @Patch(":id/deal-confirmation")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.LANDLORD, Role.ADMIN)
  updateDealConfirmation(
    @Param("id") id: string,
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(updateDealConfirmationSchema))
    dto: UpdateDealConfirmationDto,
  ) {
    return this.propertiesService.updateDealConfirmation(id, dto, req.user);
  }

  @Get(":id/messages")
  @UseGuards(JwtAuthGuard)
  listMessages(@Param("id") id: string, @Req() req: AuthenticatedRequest) {
    return this.propertiesService.listMessages(id, req.user);
  }

  @Post(":id/messages")
  @UseGuards(JwtAuthGuard)
  sendMessage(
    @Param("id") id: string,
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(createMessageSchema)) dto: CreateMessageDto,
  ) {
    return this.propertiesService.sendMessage(id, dto, req.user);
  }

  @Get(":id/interests")
  @UseGuards(JwtAuthGuard)
  listInterests(@Param("id") id: string, @Req() req: AuthenticatedRequest) {
    return this.propertiesService.listInterests(id, req.user);
  }

  @Post(":id/submit")
  @UseGuards(JwtAuthGuard, PaymentRequiredGuard)
  @PaymentRequired("PROPERTY_VERIFICATION", "id")
  submitForVerification(
    @Param("id") id: string,
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(submitForVerificationSchema))
    dto: SubmitForVerificationDto,
  ) {
    return this.propertiesService.submitForVerification(id, dto, req.user);
  }

  @Post("upload-url")
  @UseGuards(JwtAuthGuard)
  createSignedUpload(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(createSignedUploadSchema))
    dto: CreateSignedUploadDto,
  ) {
    return this.propertiesService.createSignedUpload(dto, req.user);
  }

  @Get(":id/media")
  listMedia(@Param("id") id: string) {
    return this.propertiesService.listMedia(id);
  }

  @Delete(":id/media/:mediaId")
  @UseGuards(JwtAuthGuard)
  deleteMedia(
    @Param("id") id: string,
    @Param("mediaId") mediaId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.propertiesService.deleteMedia(id, mediaId, req.user);
  }

  @Post(":id/media/upload")
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
      fileFilter: (req, file, cb) => {
        const allowedMimes = [
          "image/jpeg",
          "image/png",
          "image/webp",
          "video/mp4",
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ];
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new Error(
              "Only JPEG, PNG, WebP, MP4, PDF, and Word documents are allowed",
            ),
            false,
          );
        }
      },
    }),
  )
  uploadMedia(
    @Param("id") id: string,
    @UploadedFile()
    file: { originalname: string; mimetype: string; buffer: Buffer },
    @Req() req: AuthenticatedRequest,
  ) {
    if (!file) {
      throw new BadRequestException("No file provided");
    }
    return this.propertiesService.uploadLocalMedia(
      id,
      {
        filename: file.originalname,
        mimetype: file.mimetype,
        buffer: file.buffer,
      },
      req.user,
    );
  }

  @Post(":id/media/link")
  @UseGuards(JwtAuthGuard)
  linkMedia(
    @Param("id") id: string,
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(linkMediaSchema)) dto: LinkMediaDto,
  ) {
    return this.propertiesService.linkMedia(id, dto, req.user);
  }

  @Post(":id/viewings/schedule")
  @UseGuards(JwtAuthGuard)
  scheduleViewing(
    @Param("id") id: string,
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(scheduleViewingSchema)) dto: ScheduleViewingDto,
  ) {
    return this.propertiesService.scheduleViewing(id, dto, req.user);
  }

  @Get(":id/viewing-slots")
  @UseGuards(OptionalJwtAuthGuard)
  listViewingSlots(
    @Param("id") id: string,
    @Req()
    req: AuthenticatedRequest & { user?: { userId: string; role: Role } },
  ) {
    return this.propertiesService.listViewingSlots(id, req.user);
  }

  @Post(":id/viewing-slots")
  @UseGuards(JwtAuthGuard)
  createViewingSlots(
    @Param("id") id: string,
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(createViewingSlotsSchema))
    dto: CreateViewingSlotsDto,
  ) {
    return this.propertiesService.createViewingSlots(id, dto, req.user);
  }

  @Patch(":id/viewing-slots/:slotId/cancel")
  @UseGuards(JwtAuthGuard)
  cancelViewingSlot(
    @Param("id") id: string,
    @Param("slotId") slotId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.propertiesService.cancelViewingSlot(id, slotId, req.user);
  }

  @Patch(":id/viewing-slots/:slotId")
  @UseGuards(JwtAuthGuard)
  updateViewingSlot(
    @Param("id") id: string,
    @Param("slotId") slotId: string,
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(updateViewingSlotSchema))
    dto: UpdateViewingSlotDto,
  ) {
    return this.propertiesService.updateViewingSlot(id, slotId, dto, req.user);
  }

  @Post(":id/rent-payments")
  @UseGuards(JwtAuthGuard)
  createRentPayment(
    @Param("id") id: string,
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(createRentPaymentSchema))
    dto: CreateRentPaymentDto,
  ) {
    return this.propertiesService.createRentPayment(id, dto, req.user);
  }

  @Post("viewings/:viewingId/respond")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.LANDLORD, Role.AGENT, Role.ADMIN)
  respondToViewing(
    @Param("viewingId") viewingId: string,
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(respondViewingSchema)) dto: RespondViewingDto,
  ) {
    return this.propertiesService.respondToViewing(viewingId, dto, req.user);
  }

  @Get(":id/viewings")
  @UseGuards(JwtAuthGuard)
  listViewings(@Param("id") id: string, @Req() req: AuthenticatedRequest) {
    return this.propertiesService.listViewings(id, req.user);
  }

  @Get(":id/payments")
  @UseGuards(JwtAuthGuard)
  listPayments(@Param("id") id: string, @Req() req: AuthenticatedRequest) {
    return this.propertiesService.listPayments(id, req.user);
  }

  @Post(":id/payments/offline")
  @UseGuards(JwtAuthGuard)
  createOfflinePayment(
    @Param("id") id: string,
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(createOfflineListingPaymentSchema))
    dto: CreateOfflineListingPaymentDto,
  ) {
    return this.propertiesService.createOfflineListingPayment(
      id,
      dto,
      req.user,
    );
  }

  @Post(":id/payments/offline/:paymentId/approve")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  approveOfflinePayment(
    @Param("id") id: string,
    @Param("paymentId") paymentId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.propertiesService.approveOfflineListingPayment(
      id,
      paymentId,
      req.user,
    );
  }

  @Post(":id/payments/invoices")
  @UseGuards(JwtAuthGuard)
  createListingInvoice(
    @Param("id") id: string,
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(createListingInvoiceSchema))
    dto: CreateListingInvoiceDto,
  ) {
    return this.propertiesService.createListingPaymentInvoice(
      id,
      dto,
      req.user,
    );
  }

  @Post(":id/verification/refresh")
  @UseGuards(JwtAuthGuard)
  refreshVerification(
    @Param("id") id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.propertiesService.refreshPropertyVerification(id, req.user);
  }

  @Get(":id/verification-request")
  @UseGuards(JwtAuthGuard)
  getVerificationRequest(
    @Param("id") id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.propertiesService.getVerificationRequest(id, req.user);
  }

  @Patch(":propertyId/verification-items/:itemId")
  @UseGuards(JwtAuthGuard)
  updateVerificationItem(
    @Param("propertyId") propertyId: string,
    @Param("itemId") itemId: string,
    @Body(new ZodValidationPipe(updateVerificationItemSchema))
    dto: UpdateVerificationItemDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.propertiesService.updateVerificationItem(
      propertyId,
      itemId,
      dto,
      req.user,
    );
  }

  @Post(":id/ratings")
  @UseGuards(JwtAuthGuard)
  submitPropertyRating(
    @Param("id") id: string,
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(submitPropertyRatingSchema))
    dto: SubmitPropertyRatingDto,
  ) {
    return this.propertiesService.submitPropertyRating(id, dto, req.user);
  }

  @Get(":id/ratings")
  @UseGuards(JwtAuthGuard)
  getPropertyRatings(
    @Param("id") id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.propertiesService.getPropertyRatings(id, req.user);
  }

  @Get(":id/activity-logs")
  @UseGuards(JwtAuthGuard)
  getActivityLogs(@Param("id") id: string, @Req() req: AuthenticatedRequest) {
    return this.propertiesService.getActivityLogs(id, req.user);
  }
}
