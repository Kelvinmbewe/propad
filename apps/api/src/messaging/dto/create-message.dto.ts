import { IsString, IsNotEmpty } from "class-validator";
import { IsObject, IsOptional } from "class-validator";

export class CreateMessageDto {
  @IsString()
  @IsNotEmpty()
  conversationId!: string;

  @IsString()
  @IsNotEmpty()
  body!: string;

  @IsObject()
  @IsOptional()
  attachments?: Record<string, unknown>;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
