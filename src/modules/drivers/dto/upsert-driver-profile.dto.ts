import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpsertDriverProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  fullName?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  licenseNo?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  passportNo?: string;

  @IsOptional()
  docs?: any;
}
