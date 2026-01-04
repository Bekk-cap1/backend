import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RejectDriverDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
