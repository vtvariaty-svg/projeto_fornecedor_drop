import {
  IsEnum,
  IsHexColor,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";
import { BrandStatus } from "@prisma/client";

export class UpdateBrandDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsEnum(BrandStatus)
  status?: BrandStatus;

  @IsOptional()
  @IsHexColor()
  primaryColor?: string;

  @IsOptional()
  @IsHexColor()
  secondaryColor?: string;

  @IsOptional()
  @IsHexColor()
  accentColor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  toneOfVoice?: string;

  @IsOptional()
  @IsString()
  brandStory?: string;

  @IsOptional()
  @IsString()
  guidelines?: string;
}
