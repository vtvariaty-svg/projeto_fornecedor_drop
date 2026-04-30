import { IsString, IsEnum, IsOptional, IsEmail } from "class-validator";
import { UserRole } from "@prisma/client";

export class AttachUserToTenantDto {
  @IsString()
  @IsOptional()
  userId?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;
}
