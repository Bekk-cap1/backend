import { IsOptional, IsString } from 'class-validator';

export class PublishTripDto {
  @IsOptional()
  @IsString()
  notes?: string;
}
