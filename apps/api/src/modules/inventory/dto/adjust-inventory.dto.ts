import { IsEnum, IsInt, IsOptional, IsString, Min } from "class-validator";
import { InventoryMovementType } from "@prisma/client";

// Apenas tipos de ajuste manual sÃ£o permitidos via endpoint admin
const ALLOWED_ADJUSTMENT_TYPES = [
  InventoryMovementType.ADJUSTMENT_IN,
  InventoryMovementType.ADJUSTMENT_OUT,
  InventoryMovementType.MANUAL_CORRECTION,
  InventoryMovementType.RETURN,
] as const;

export type AllowedAdjustmentType = (typeof ALLOWED_ADJUSTMENT_TYPES)[number];

export class AdjustInventoryDto {
  @IsEnum(ALLOWED_ADJUSTMENT_TYPES, {
    message: `type deve ser um de: ${ALLOWED_ADJUSTMENT_TYPES.join(", ")}`,
  })
  type!: AllowedAdjustmentType;

  @IsInt()
  @Min(1, { message: "quantity deve ser no mÃ­nimo 1" })
  quantity!: number;

  @IsOptional()
  @IsString()
  reason?: string;
}
