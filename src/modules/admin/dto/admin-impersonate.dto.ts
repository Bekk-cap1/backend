import { IsString, IsUUID, MinLength } from 'class-validator';

export class AdminImpersonateDto {
  @IsUUID()
  userId!: string;

  @IsString()
  @MinLength(10)
  reason!: string;
}
