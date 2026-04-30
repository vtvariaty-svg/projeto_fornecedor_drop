import { IsString, IsNotEmpty, MaxLength } from "class-validator";

export class RejectBrandAssetDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}
