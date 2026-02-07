import { IsEnum, IsString, Length, Matches } from 'class-validator';
import { OtpPurpose } from '@prisma/client';

export class VerifyOtpDto {
  @IsString()
  @Matches(/^\+?\d{9,15}$/)
  phone!: string;

  @IsEnum(OtpPurpose)
  purpose!: OtpPurpose;

  @IsString()
  @Length(4, 8)
  code!: string;
}
