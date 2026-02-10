import { IsOptional, IsString, MinLength } from 'class-validator';

export class AdminResetPasswordDto {
  @IsOptional()
  @IsString()
  @MinLength(8)
  newPassword?: string;

  @IsString()
  @MinLength(10)
  reason!: string;
}
