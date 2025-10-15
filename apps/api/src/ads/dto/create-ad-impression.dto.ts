import { IsInt, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateAdImpressionDto {
  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsString()
  @MaxLength(255)
  route!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  source?: string;

  @IsString()
  @MaxLength(64)
  sessionId!: string;

  @IsOptional()
  @IsInt()
  revenueMicros?: number;
}
