import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsInt, IsNumber, Min } from "class-validator";

export class LinkProductCustomizationOptionDto {
  @IsString()
  @IsNotEmpty()
  customizationOptionId!: string;

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  additionalPrice?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
