import { Module } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { RentalV2Controller } from "./rental-v2.controller";
import { RentalV2Service } from "./rental-v2.service";

@Module({
  controllers: [RentalV2Controller],
  providers: [RentalV2Service, PrismaService],
  exports: [RentalV2Service],
})
export class RentalV2Module {}
