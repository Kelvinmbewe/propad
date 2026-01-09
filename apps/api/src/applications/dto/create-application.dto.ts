import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateApplicationDto {
    @IsString()
    @IsNotEmpty()
    propertyId: string;

    @IsString()
    @IsOptional()
    notes?: string;
}
