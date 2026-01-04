import { IsString, MinLength } from 'class-validator';

export class RejectDriverDto {
  @IsString()
  @MinLength(3)
  reason!: string;
}
