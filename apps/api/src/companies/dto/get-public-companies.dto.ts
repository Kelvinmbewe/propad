import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";

export class GetPublicCompaniesDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => Number(value))
  @IsNumber()
  lat?: number;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => Number(value))
  @IsNumber()
  lng?: number;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(500)
  radiusKm?: number;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  province?: string;

  @IsOptional()
  @IsIn(["SALES", "LETTINGS"])
  service?: "SALES" | "LETTINGS";

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === true || value === "true" || value === "1") return true;
    if (value === false || value === "false" || value === "0") return false;
    return undefined;
  })
  @IsBoolean()
  verifiedOnly?: boolean;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => Number(value))
  @IsInt()
  @Min(0)
  @Max(100)
  minTrust?: number;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => Number(value))
  @IsNumber()
  @Min(0)
  @Max(5)
  minRating?: number;

  @IsOptional()
  @IsIn(["RECOMMENDED", "TRUST", "RATING", "MOST_LISTINGS", "NEAREST"])
  sort?: "RECOMMENDED" | "TRUST" | "RATING" | "MOST_LISTINGS" | "NEAREST";

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(30)
  take?: number;

  @IsOptional()
  @IsString()
  cursor?: string;
}
