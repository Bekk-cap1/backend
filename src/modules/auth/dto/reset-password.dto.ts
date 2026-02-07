import { IsString, Matches, MinLength } from 'class-validator';

export class ResetPasswordRequestDto {
  @IsString()
  @Matches(/^\+?\d{9,15}$/)
  phone!: string;
}

export class ResetPasswordConfirmDto {
  @IsString()
  @Matches(/^\+?\d{9,15}$/)
  phone!: string;

  @IsString()
  code!: string;

  @IsString()
  @MinLength(6)
  newPassword!: string;
}
