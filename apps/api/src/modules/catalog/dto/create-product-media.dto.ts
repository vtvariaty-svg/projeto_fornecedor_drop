import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsUrl,
  Min,
  MaxLength,
} from "class-validator";
import { Type } from "class-transformer";

export class CreateProductMediaDto {
  @IsUrl()
  @IsNotEmpty()
  url!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  storageKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  altText?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  sortOrder?: number;

  @IsOptional()
  @IsString()
  variantId?: string;
}
