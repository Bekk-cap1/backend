import { IsEnum, IsString, Length, Matches } from 'class-validator';
import { OtpPurpose } from '@prisma/client';
import { Transform } from 'class-transformer';

const normalizePhoneTransform = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.replace(/\s+/g, '').trim() : value;

export class VerifyOtpDto {
  @Transform(normalizePhoneTransform)
  @IsString()
  @Matches(/^\+?\d{9,15}$/)
  phone!: string;

  @IsEnum(OtpPurpose)
  purpose!: OtpPurpose;

  @IsString()
  @Length(4, 8)
  code!: string;
}
