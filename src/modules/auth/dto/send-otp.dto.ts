import { IsEnum, IsString, Matches } from 'class-validator';
import { OtpPurpose } from '@prisma/client';

export class SendOtpDto {
  @IsString()
  @Matches(/^\+?\d{9,15}$/)
  phone!: string;

  @IsEnum(OtpPurpose)
  purpose!: OtpPurpose;
}
