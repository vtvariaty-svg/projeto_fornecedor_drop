import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CustomizationOptionsService } from "./customization-options.service";
import { CreateCustomizationOptionDto } from "./dto/create-customization-option.dto";
import { UpdateCustomizationOptionDto } from "./dto/update-customization-option.dto";
import { LinkProductCustomizationOptionDto } from "./dto/link-product-customization-option.dto";

@Controller("admin/customization-options")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
export class AdminCustomizationOptionsController {
  constructor(private readonly service: CustomizationOptionsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateCustomizationOptionDto) {
    return this.service.create(dto);
  }

  @Get()
  list() {
    return this.service.list(false);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.service.findById(id);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateCustomizationOptionDto) {
    return this.service.update(id, dto);
  }

  @Post("products/:productId")
  @HttpCode(HttpStatus.CREATED)
  linkToProduct(
    @Param("productId") productId: string,
    @Body() dto: LinkProductCustomizationOptionDto
  ) {
    return this.service.linkToProduct(productId, dto);
  }

  @Get("products/:productId")
  listByProduct(@Param("productId") productId: string) {
    return this.service.listByProduct(productId);
  }

  @Delete("products/:productId/:optionId")
  @HttpCode(HttpStatus.OK)
  unlinkFromProduct(
    @Param("productId") productId: string,
    @Param("optionId") optionId: string
  ) {
    return this.service.unlinkFromProduct(productId, optionId);
  }
}
