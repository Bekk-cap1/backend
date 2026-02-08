import { IsEnum, IsString, Matches } from 'class-validator';
import { OtpPurpose } from '@prisma/client';
import { Transform } from 'class-transformer';

const normalizePhoneTransform = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.replace(/\s+/g, '').trim() : value;

export class SendOtpDto {
  @Transform(normalizePhoneTransform)
  @IsString()
  @Matches(/^\+?\d{9,15}$/)
  phone!: string;

  @IsEnum(OtpPurpose)
  purpose!: OtpPurpose;
}
