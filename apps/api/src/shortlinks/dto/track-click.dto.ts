import { IsOptional, IsString, MaxLength } from 'class-validator';

export class TrackClickDto {
  @IsOptional()
  @IsString()
  @MaxLength(32)
  contactPhone?: string;

  @IsOptional()
  @IsString()
  channelRef?: string;
}
