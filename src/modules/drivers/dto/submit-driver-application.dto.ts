import { Type } from 'class-transformer';
import {
  IsArray,
  IsOptional,
  IsString,
  IsUrl,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class DriverExtraDocDto {
  @IsString()
  @MinLength(2)
  label!: string;

  @IsString()
  @IsUrl({ require_tld: false }, { message: 'extras.url must be a valid URL' })
  url!: string;
}

export class DriverDocsDto {
  @IsString()
  @IsUrl(
    { require_tld: false },
    { message: 'licenseFrontUrl must be a valid URL' },
  )
  licenseFrontUrl!: string;

  @IsOptional()
  @IsString()
  @IsUrl(
    { require_tld: false },
    { message: 'licenseBackUrl must be a valid URL' },
  )
  licenseBackUrl?: string;

  @IsString()
  @IsUrl(
    { require_tld: false },
    { message: 'passportFrontUrl must be a valid URL' },
  )
  passportFrontUrl!: string;

  @IsOptional()
  @IsString()
  @IsUrl(
    { require_tld: false },
    { message: 'passportBackUrl must be a valid URL' },
  )
  passportBackUrl?: string;

  @IsOptional()
  @IsString()
  @IsUrl({ require_tld: false }, { message: 'selfieUrl must be a valid URL' })
  selfieUrl?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DriverExtraDocDto)
  extras?: DriverExtraDocDto[];
}

export class SubmitDriverApplicationDto {
  @ValidateNested()
  @Type(() => DriverDocsDto)
  docs!: DriverDocsDto;

  @IsOptional()
  @IsString()
  notes?: string;
}
