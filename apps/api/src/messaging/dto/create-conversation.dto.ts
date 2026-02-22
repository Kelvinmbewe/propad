import { IsArray, IsOptional, IsString } from "class-validator";

export class CreateConversationDto {
  @IsString()
  @IsOptional()
  listingId?: string;

  @IsString()
  @IsOptional()
  propertyId?: string;

  @IsString()
  @IsOptional()
  recipientId?: string;

  @IsString()
  @IsOptional()
  companyId?: string;

  // Legacy fields still accepted.
  @IsString()
  @IsOptional()
  dealId?: string;

  @IsString()
  @IsOptional()
  applicationId?: string;

  @IsArray()
  @IsOptional()
  participantIds?: string[];
}
