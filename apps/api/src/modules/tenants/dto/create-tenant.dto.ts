import { IsString, IsEnum, IsOptional, MinLength, Matches } from "class-validator";
import { TenantStatus } from "@prisma/client";

export class CreateTenantDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: "slug deve conter apenas letras minúsculas, números e hífens" })
  slug!: string;

  @IsEnum(TenantStatus)
  @IsOptional()
  status?: TenantStatus;
}
