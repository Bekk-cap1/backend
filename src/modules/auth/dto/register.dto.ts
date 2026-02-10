import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

const normalizePhoneTransform = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.replace(/\s+/g, '').trim() : value;

export class RegisterDto {
  @Transform(normalizePhoneTransform)
  @IsString()
  @Matches(/^\+?\d{9,15}$/)
  phone!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsString()
  @MinLength(2)
  fullName!: string;

  @IsOptional()
  @IsString()
  @IsIn(['ru', 'uz', 'en'])
  language?: 'ru' | 'uz' | 'en';

  @IsOptional()
  @IsString()
  cityId?: string;

  @IsOptional()
  @IsString()
  referralCode?: string;

  @IsBoolean()
  acceptTerms!: boolean;
}
