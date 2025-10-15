import { IsOptional, IsString, IsUrl, IsUUID, MaxLength } from 'class-validator';

export class CreateShortLinkDto {
  @IsUrl()
  targetUrl!: string;

  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  utmSource?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  utmMedium?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  utmCampaign?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  utmTerm?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  utmContent?: string;
}
