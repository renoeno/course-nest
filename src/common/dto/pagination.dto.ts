import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsPositive, Max, Min } from 'class-validator';

export class PaginationDto {
  @IsOptional()
  @Min(0)
  @Max(50)
  @IsInt()
  @Type(() => Number)
  limit: number;

  @IsOptional()
  @Min(0)
  @IsInt()
  @Type(() => Number)
  offset: number;
}
