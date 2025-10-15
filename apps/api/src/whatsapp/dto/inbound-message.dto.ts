import { IsOptional, IsString, MaxLength } from 'class-validator';

export class InboundMessageDto {
  @IsString()
  @MaxLength(32)
  from!: string;

  @IsString()
  @MaxLength(512)
  message!: string;

  @IsOptional()
  @IsString()
  locale?: string;
}
