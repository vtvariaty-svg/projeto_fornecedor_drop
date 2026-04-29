import { IsInt, IsOptional, Min } from "class-validator";
import { Type } from "class-transformer";

export class ListMovementsQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number = 50;
}
