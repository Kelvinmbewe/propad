import { GeoLevel } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CreatePendingGeoDto {
  @IsEnum(GeoLevel)
  level!: GeoLevel;

  @IsString()
  proposedName!: string;

  @IsOptional()
  @IsString()
  parentId?: string;
}
