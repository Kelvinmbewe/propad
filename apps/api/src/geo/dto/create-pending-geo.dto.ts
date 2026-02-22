import { IsEnum, IsOptional, IsString } from 'class-validator';
import { GeoLevel } from '@prisma/client';
import { GeoLevelEnum } from '@propad/config';

export class CreatePendingGeoDto {
  @IsEnum(GeoLevelEnum)
  level!: GeoLevel;

  @IsString()
  proposedName!: string;

  @IsOptional()
  @IsString()
  parentId?: string;
}
