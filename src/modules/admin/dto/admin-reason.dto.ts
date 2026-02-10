import { IsString, MinLength } from 'class-validator';

export class AdminReasonDto {
  @IsString()
  @MinLength(10)
  reason!: string;
}
