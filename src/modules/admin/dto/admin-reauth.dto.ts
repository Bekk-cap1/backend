import { IsString, MinLength } from 'class-validator';

export class AdminReauthDto {
  @IsString()
  @MinLength(6)
  password!: string;
}
