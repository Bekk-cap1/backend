import { IsOptional, IsString, MaxLength } from 'class-validator';

export class OfferAcceptDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class OfferRejectDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
