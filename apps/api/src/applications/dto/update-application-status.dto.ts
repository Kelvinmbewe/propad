import {
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";
import { ApplicationStatus } from "@prisma/client";

export class UpdateApplicationStatusDto {
  @IsEnum(ApplicationStatus)
  @IsNotEmpty()
  status!: ApplicationStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @IsOptional()
  @IsString()
  @IsIn(["SCHEDULE_VIEWING", "PROCEED_TO_DEAL"])
  nextStep?: "SCHEDULE_VIEWING" | "PROCEED_TO_DEAL";
}
