import {
  IsArray,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export class OrderItemCustomizationDto {
  @IsString()
  @IsNotEmpty()
  optionId!: string;

  @IsOptional()
  @IsString()
  assetId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  value?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class CreateManualOrderItemDto {
  @IsString()
  variantId!: string;

  @IsInt()
  @Min(1, { message: "quantity deve ser no minimo 1" })
  quantity!: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemCustomizationDto)
  customizations?: OrderItemCustomizationDto[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  customizationNotes?: string;
}

export class ShippingAddressDto {
  @IsString()
  street!: string;

  @IsString()
  city!: string;

  @IsString()
  state!: string;

  @IsString()
  postalCode!: string;

  @IsString()
  country!: string;

  @IsOptional()
  @IsString()
  complement?: string;

  @IsOptional()
  @IsString()
  number?: string;
}

export class CreateManualOrderDto {
  @IsString()
  customerName!: string;

  @IsOptional()
  @IsEmail()
  customerEmail?: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsObject()
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress!: ShippingAddressDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateManualOrderItemDto)
  items!: CreateManualOrderItemDto[];

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  brandId?: string;
}
