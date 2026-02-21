import { ListingIntent } from "@prisma/client";
import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";

export class GetCompanyListingsDto {
  @IsOptional()
  @IsEnum(ListingIntent)
  intent?: ListingIntent;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === true || value === "true" || value === "1") return true;
    if (value === false || value === "false" || value === "0") return false;
    return undefined;
  })
  @IsBoolean()
  verifiedOnly?: boolean;

  @IsOptional()
  @IsString()
  sort?: "TRUST" | "PRICE_ASC" | "PRICE_DESC" | "NEWEST";

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => Number(value))
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number;
}
