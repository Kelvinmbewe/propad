import {
  Body,
  Controller,
  Get,
  Patch,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Role } from "@propad/config";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { AuthenticatedRequest } from "../auth/interfaces/authenticated-request.interface";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import {
  CreateLeasePaymentDto,
  createLeasePaymentSchema,
} from "./dto/create-lease-payment.dto";
import {
  CreateRentalRatingDto,
  createRentalRatingSchema,
} from "./dto/create-rental-rating.dto";
import { EndLeaseDto, endLeaseSchema } from "./dto/end-lease.dto";
import {
  MarkLeasePaymentStatusDto,
  markLeasePaymentStatusSchema,
} from "./dto/mark-lease-payment-status.dto";
import { RatingQueryDto, ratingQuerySchema } from "./dto/rating-query.dto";
import { RentalV2Service } from "./rental-v2.service";

@Controller("rental-v2")
@UseGuards(JwtAuthGuard, RolesGuard)
export class RentalV2Controller {
  constructor(private readonly service: RentalV2Service) {}

  @Get("leases/my")
  @Roles(
    Role.ADMIN,
    Role.LANDLORD,
    Role.USER,
    Role.TENANT,
    Role.AGENT,
    Role.COMPANY_ADMIN,
  )
  listMyLeases(@Req() req: AuthenticatedRequest) {
    return this.service.listMyLeases(req.user);
  }

  @Get("leases/property/:propertyId")
  @Roles(Role.ADMIN, Role.LANDLORD, Role.AGENT, Role.COMPANY_ADMIN)
  listPropertyLeases(
    @Param("propertyId") propertyId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.listPropertyLeases(propertyId, req.user);
  }

  @Get("leases/:leaseId")
  @Roles(
    Role.ADMIN,
    Role.LANDLORD,
    Role.USER,
    Role.TENANT,
    Role.AGENT,
    Role.COMPANY_ADMIN,
  )
  getLease(
    @Param("leaseId") leaseId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.getLeaseById(leaseId, req.user);
  }

  @Post("leases/:leaseId/end")
  @Roles(Role.ADMIN, Role.LANDLORD, Role.AGENT, Role.COMPANY_ADMIN)
  endLease(
    @Param("leaseId") leaseId: string,
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(endLeaseSchema)) dto: EndLeaseDto,
  ) {
    return this.service.endLeaseAndRepublish(leaseId, dto, req.user);
  }

  @Post("leases/:leaseId/ratings")
  @Roles(Role.ADMIN, Role.LANDLORD, Role.USER, Role.TENANT)
  createRentalRating(
    @Param("leaseId") leaseId: string,
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(createRentalRatingSchema))
    dto: CreateRentalRatingDto,
  ) {
    return this.service.createRentalRating(leaseId, dto, req.user);
  }

  @Get("ratings")
  @Roles(
    Role.ADMIN,
    Role.LANDLORD,
    Role.USER,
    Role.TENANT,
    Role.AGENT,
    Role.COMPANY_ADMIN,
  )
  listRatings(
    @Req() req: AuthenticatedRequest,
    @Query(new ZodValidationPipe(ratingQuerySchema)) dto: RatingQueryDto,
  ) {
    return this.service.listRatings(dto, req.user);
  }

  @Post("leases/:leaseId/payments")
  @Roles(Role.ADMIN, Role.USER, Role.TENANT)
  createLeasePayment(
    @Param("leaseId") leaseId: string,
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(createLeasePaymentSchema))
    dto: CreateLeasePaymentDto,
  ) {
    return this.service.createLeasePayment(leaseId, dto, req.user);
  }

  @Patch("payments/:paymentId/status")
  @Roles(Role.ADMIN, Role.LANDLORD)
  markPaymentStatus(
    @Param("paymentId") paymentId: string,
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(markLeasePaymentStatusSchema))
    dto: MarkLeasePaymentStatusDto,
  ) {
    return this.service.markLeasePaymentStatus(paymentId, dto, req.user);
  }

  @Get("payments/mine")
  @Roles(Role.ADMIN, Role.USER, Role.TENANT)
  listMyPayments(@Req() req: AuthenticatedRequest) {
    return this.service.listMyRentPayments(req.user);
  }

  @Get("lease-options/mine")
  @Roles(Role.ADMIN, Role.USER, Role.TENANT)
  listMyLeaseOptions(@Req() req: AuthenticatedRequest) {
    return this.service.listMyLeaseOptions(req.user);
  }
}
