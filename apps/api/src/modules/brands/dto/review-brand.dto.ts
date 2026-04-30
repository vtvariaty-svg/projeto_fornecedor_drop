import { IsString, IsNotEmpty, MaxLength } from "class-validator";

export class RejectBrandDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}
