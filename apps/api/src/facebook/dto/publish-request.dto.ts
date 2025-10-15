import { IsArray, IsBoolean, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class PublishRequestDto {
  @IsUUID()
  propertyId!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  groupIds?: string[];

  @IsOptional()
  @IsBoolean()
  marketplace?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  medium?: string;
}
