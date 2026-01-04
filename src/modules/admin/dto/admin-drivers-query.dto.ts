import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Min } from 'class-validator';

export class AdminDriversQueryDto {
  @IsOptional()
  @IsIn(['draft', 'pending', 'verified', 'rejected'])
  status?: 'draft' | 'pending' | 'verified' | 'rejected';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;
}
