import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RejectOfferDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string
  note?: string;
}
