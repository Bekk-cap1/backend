import { IsOptional, IsString, MinLength } from 'class-validator';

export class ApplyDriverDto {
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

  // docs: ссылки/метаданные (позже вынесем в storage)
  @IsOptional()
  docs?: any;
}
