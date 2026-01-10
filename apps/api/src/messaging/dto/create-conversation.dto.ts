
import { IsString, IsNotEmpty, IsArray, IsOptional } from 'class-validator';

export class CreateConversationDto {
    @IsString()
    @IsNotEmpty()
    propertyId: string;

    @IsString()
    @IsOptional()
    dealId?: string;

    @IsString()
    @IsOptional()
    applicationId?: string;

    @IsArray()
    @IsNotEmpty()
    participantIds: string[];
}
