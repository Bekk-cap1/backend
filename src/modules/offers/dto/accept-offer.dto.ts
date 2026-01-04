import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AcceptOfferDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
