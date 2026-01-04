import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RejectTripRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
