import { IsEnum, IsOptional, IsString } from 'class-validator';
import { GeoLevel } from './geo-level.enum';

export class CreatePendingGeoDto {
  @IsEnum(GeoLevel)
  level!: GeoLevel;

  @IsString()
  proposedName!: string;

  @IsOptional()
  @IsString()
  parentId?: string;
}
